#!/usr/bin/env node
/**
 * Rydder op i duplikerede personlige checkliste-navne.
 *
 * For en given bruger (OWNER_UID) findes alle /users/{uid}/checklists docs.
 * Hvis der findes flere lister med samme navn, beholdes den nyeste (updatedAt)
 * og resten slettes — inklusiv tilhørende items subcollection.
 *
 * Kræver GOOGLE_APPLICATION_CREDENTIALS og SEED_OWNER_UID.
 *
 * TØR KUN KØRES MOD PRODUKTION EFTER GODKENDELSE FRA PO.
 *
 * Brug: node scripts/cleanup-duplicate-checklists.js [--dry-run]
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const DRY_RUN = process.argv.includes("--dry-run");

function requireEnvOrCred() {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS || null;
}

async function main() {
  if (getApps().length === 0) {
    const credPath = requireEnvOrCred();
    if (credPath) {
      initializeApp({ credential: cert(require(credPath)) });
    } else {
      initializeApp();
    }
  }

  const db = getFirestore();
  const OWNER_UID = process.env.SEED_OWNER_UID;
  if (!OWNER_UID) {
    console.error("[cleanup] SEED_OWNER_UID is required.");
    process.exit(1);
  }

  const checklistsRef = db.collection("users").doc(OWNER_UID).collection("checklists");
  const snapshot = await checklistsRef.get();

  const byName = new Map();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const name = data.name || "(uden navn)";
    if (!byName.has(name)) {
      byName.set(name, []);
    }
    byName.get(name).push({ id: doc.id, updatedAt: data.updatedAt });
  }

  let deleted = 0;
  for (const [name, docs] of byName.entries()) {
    if (docs.length <= 1) continue;
    console.log(`[cleanup] Found ${docs.length} duplicate(s) named "${name}"`);

    // Sort descending by updatedAt; keep newest.
    docs.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || 0;
      const bTime = b.updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    const keep = docs[0];
    console.log(`[cleanup] Keeping ${keep.id}`);

    for (const toDelete of docs.slice(1)) {
      const checklistRef = checklistsRef.doc(toDelete.id);
      const itemsSnap = await checklistRef.collection("items").get();

      if (DRY_RUN) {
        console.log(
          `[cleanup] DRY-RUN would delete checklist ${toDelete.id} with ${itemsSnap.size} item(s)`
        );
        deleted++;
        continue;
      }

      const batch = db.batch();
      for (const itemDoc of itemsSnap.docs) {
        batch.delete(itemDoc.ref);
      }
      batch.delete(checklistRef);
      await batch.commit();
      console.log(`[cleanup] Deleted duplicate ${toDelete.id}`);
      deleted++;
    }
  }

  const mode = DRY_RUN ? "would delete" : "deleted";
  console.log(`[cleanup] Done. ${mode} ${deleted} duplicate checklist(s).`);
}

main().catch((err) => {
  console.error("[cleanup] Failed:", err);
  process.exit(1);
});
