/**
 * One-off script: sletter alle eksisterende checklists + subcollection items.
 * Køres ved første deploy før de nye project-scoped regler tages i brug.
 *
 * Forudsætning:
 *  - GOOGLE_APPLICATION_CREDENTIALS peger på en service-account JSON, ELLER
 *  - `firebase login:ci` token er sat via FIREBASE_TOKEN.
 *
 * Kørsel:
 *  npm install
 *  npm run wipe:checklists
 *
 * ADVARSEL: Dette sletter ALLE lister. Gamle lister migreres IKKE (PO-beslutning).
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

async function main() {
  if (getApps().length === 0) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      });
    } else {
      initializeApp();
    }
  }

  const db = getFirestore();
  const checklistsSnap = await db.collection("checklists").get();

  if (checklistsSnap.empty) {
    console.log("Ingen checklists at slette.");
    return;
  }

  console.log(`Fandt ${checklistsSnap.size} checklists. Sletter...`);

  let deletedChecklists = 0;
  let deletedItems = 0;

  for (const checklistDoc of checklistsSnap.docs) {
    const itemsSnap = await checklistDoc.ref.collection("items").get();
    const batch = db.batch();

    for (const itemDoc of itemsSnap.docs) {
      batch.delete(itemDoc.ref);
      deletedItems++;
    }

    batch.delete(checklistDoc.ref);
    deletedChecklists++;

    await batch.commit();
    console.log(`  Slettet ${checklistDoc.id} + ${itemsSnap.size} punkter`);
  }

  console.log(
    `Færdig: ${deletedChecklists} lister og ${deletedItems} punkter slettet.`
  );
}

main().catch((err) => {
  console.error("Fejl ved sletning af checklists:", err);
  process.exit(1);
});
