import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Callable Cloud Function: deleteProject({ projectId })
 *
 * Deletes a Firestore project document and all nested subcollections,
 * then attempts to clean up associated Storage files.
 */
export const deleteProject = functions
  .runWith({
    memory: "512MB",
    timeoutSeconds: 300,
  })
  .https.onCall(async (data: unknown, context: functions.https.CallableContext): Promise<{ success: true }> => {
    if (!context.auth) {
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

    const db = admin.firestore();
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
      throw new functions.https.HttpsError(
        "permission-denied",
        "Caller must be owner or admin of the project."
      );
    }

    await db.recursiveDelete(projectRef);

    try {
      const bucket = admin.storage().bucket();
      await bucket.deleteFiles({ prefix: `projects/${projectId}/items/` });
    } catch (error) {
      functions.logger.warn(
        `Failed to delete Storage files for project ${projectId}`,
        error
      );
    }

    return { success: true };
  });
