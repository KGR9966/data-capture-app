#!/usr/bin/env node
/**
 * Liste alle projekter i Firestore-produktion for at verificere
 * om app-cache og server-data er ude af sync.
 *
 * Kræver:
 *   npx firebase login
 *   ELLER GOOGLE_APPLICATION_CREDENTIALS sat.
 */

const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

async function main() {
  if (getApps().length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      initializeApp({ credential: cert(require(credPath)) });
    } else {
      initializeApp({ projectId: "data-capture-506bd" });
    }
  }

  const db = getFirestore();
  const snapshot = await db.collection("projects").get();

  console.log(`\nFandt ${snapshot.size} projekter i Firestore:\n`);
  console.log(
    ["ID", "Navn", "ownerId", "roles-nøgler", "memberEmails"]
      .map((h) => h.padEnd(30))
      .join(" | ")
  );
  console.log("-".repeat(140));

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const roles = data.roles ? Object.keys(data.roles).join(", ") : "(ingen)";
    const emails = data.memberEmails
      ? data.memberEmails.join(", ")
      : "(ingen)";
    console.log(
      [
        doc.id.padEnd(30),
        (data.name || "").padEnd(30),
        (data.ownerId || "").padEnd(30),
        roles.padEnd(30),
        emails.padEnd(30),
      ].join(" | ")
    );
  });
}

main().catch((err) => {
  console.error("FEJL:", err);
  process.exit(1);
});
