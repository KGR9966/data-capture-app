import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Callable Cloud Function: deleteProject({ projectId })
 *
 * Deletes a Firestore project document and all nested subcollections using the
 * Admin SDK recursiveDelete, then attempts to clean up associated Storage files.
 *
 * Authorization: caller must be the project owner or have an owner/admin role
 * keyed by Firebase Auth UID in the project document or members subcollection.
 */
let adminInitialized = false;
function ensureAdminInitialized(): void {
  if (adminInitialized) return;
  admin.initializeApp();
  try {
    getFirestore().settings({ ignoreUndefinedProperties: true });
  } catch (error) {
    console.warn("[deleteProject] Failed to configure Firestore settings:", error);
  }
  adminInitialized = true;
}

export const deleteProject = functions
  // eslint-disable-next-line import/namespace
  .runWith({
    memory: "512MB",
    timeoutSeconds: 300,
  })
  .https.onCall(
    async (
      data: unknown,
      context: functions.https.CallableContext
    ): Promise<{ success: true; storageCleanupSuccess: boolean }> => {
      ensureAdminInitialized();
      functions.logger.info("[deleteProject] invoked v2", {
        auth: !!context.auth,
        uid: context.auth?.uid,
        projectId: (data as Record<string, unknown>)?.projectId,
      });

      if (!context.auth) {
        functions.logger.warn("[deleteProject] rejecting unauthenticated call");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Caller must be authenticated."
        );
      }

      const uid = context.auth.uid;

      const projectId = (data as Record<string, unknown>)?.projectId;
      if (typeof projectId !== "string" || projectId.length === 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "projectId must be a non-empty string."
        );
      }

      const db = getFirestore();
      const projectRef = db.collection("projects").doc(projectId);
      const projectSnap = await projectRef.get();

      if (!projectSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Project ${projectId} not found.`
        );
      }

      const projectData = projectSnap.data() ?? {};

      let isAuthorized = false;

      if (projectData.ownerId === uid) {
        isAuthorized = true;
      } else if (projectData.roles?.[uid] === "owner") {
        isAuthorized = true;
      } else if (projectData.roles?.[uid] === "admin") {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        const memberDoc = await projectRef.collection("members").doc(uid).get();
        const memberRole = memberDoc.data()?.role;
        if (memberRole === "owner" || memberRole === "admin") {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        functions.logger.warn("[deleteProject] rejecting permission-denied", { uid, projectId });
        throw new functions.https.HttpsError(
          "permission-denied",
          "Caller must be owner or admin of the project."
        );
      }

      functions.logger.info("[deleteProject] starting recursive delete", { projectId, uid });
      // Recursive delete handles all nested subcollections and scales to
      // arbitrarily deep documents, satisfying TC-B9.3.
      await db.recursiveDelete(projectRef);

      // Clean up Storage files. Failures are logged but do not fail the
      // function, so orphaned Storage objects can be handled separately.
      let storageCleanupSuccess = true;
      try {
        const bucket = getStorage().bucket();
        await bucket.deleteFiles({ prefix: `projects/${projectId}/items/` });
      } catch (error) {
        storageCleanupSuccess = false;
        functions.logger.warn(
          `Failed to delete Storage files for project ${projectId}`,
          error
        );
      }

      functions.logger.info("[deleteProject] completed", { projectId, storageCleanupSuccess });
      return { success: true, storageCleanupSuccess };
    }
  );
