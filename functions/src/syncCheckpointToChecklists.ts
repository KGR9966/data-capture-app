import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

/**
 * Firestore trigger (2nd gen): when a checkpoint under
 * projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}
 * is created or updated, propagate its completion status to all checklist
 * items that reference this checkpoint via sourceCheckpointId.
 */
let adminInitialized = false;
function ensureAdminInitialized(): void {
  if (adminInitialized) return;
  admin.initializeApp();
  try {
    getFirestore().settings({ ignoreUndefinedProperties: true });
  } catch (error) {
    console.warn("[syncCheckpointToChecklists] Failed to configure Firestore settings:", error);
  }
  adminInitialized = true;
}

export const syncCheckpointToChecklists = onDocumentWritten(
  {
    document: "projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}",
    region: "europe-west4",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureAdminInitialized();

    const after = event.data?.after.exists ? event.data.after.data() : null;
    const before = event.data?.before.exists ? event.data.before.data() : null;
    const checkpointId = event.params.checkpointId;

    const newStatus = after?.status as string | undefined;
    const oldStatus = before?.status as string | undefined;

    if (!checkpointId || newStatus === oldStatus) {
      // No meaningful status change.
      return;
    }

    const isCompleted = newStatus === "done";
    const db = getFirestore();
    const completedAt = isCompleted ? FieldValue.serverTimestamp() : null;
    const completedBy = isCompleted
      ? (after?.completedBy as string | undefined) || null
      : null;

    try {
      // Find all checklist items referencing this checkpoint. Checklist items live in
      // project subcollections and personal subcollections, so use a collection group.
      const snapshot = await db
        .collectionGroup("items")
        .where("sourceCheckpointId", "==", checkpointId)
        .get();

      if (snapshot.empty) {
        console.log(
          "[syncCheckpointToChecklists] no checklist items reference checkpoint",
          { checkpointId }
        );
        return;
      }

      const batch = db.batch();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.isCompleted === isCompleted) continue;

        batch.update(doc.ref, {
          isCompleted,
          completedAt: isCompleted ? completedAt : FieldValue.delete(),
          completedBy: isCompleted ? completedBy : FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      console.log("[syncCheckpointToChecklists] synced checkpoint to checklists", {
        checkpointId,
        isCompleted,
        count: snapshot.size,
      });
    } catch (error) {
      console.error("[syncCheckpointToChecklists] failed to sync checkpoint", {
        checkpointId,
        error,
      });
      throw error;
    }
  }
);
