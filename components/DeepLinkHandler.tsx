import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";

import { parseGeofenceEvent } from "../services/geofence";

export default function DeepLinkHandler() {
  const router = useRouter();
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url || handledRef.current.has(url)) return;
      handledRef.current.add(url);

      const event = parseGeofenceEvent(url);
      if (event) {
        const projectIdParam = event.projectId
          ? `&projectId=${encodeURIComponent(event.projectId)}`
          : "";
        router.replace(
          `/checklist?id=${encodeURIComponent(event.checklistId)}&userId=${encodeURIComponent(
            event.ownerId
          )}${projectIdParam}&geofence=true&event=${event.type}&locationId=${encodeURIComponent(
            event.locationId
          )}` as any
        );
        return;
      }

      const parsed = Linking.parse(url);
      if (parsed.scheme !== "datacapture") return;

      if (parsed.hostname === "checklist" || parsed.path?.includes("checklist")) {
        const id = Array.isArray(parsed.queryParams?.id)
          ? parsed.queryParams.id[0]
          : parsed.queryParams?.id;
        const userId = Array.isArray(parsed.queryParams?.userId)
          ? parsed.queryParams.userId[0]
          : parsed.queryParams?.userId;
        const projectId = Array.isArray(parsed.queryParams?.projectId)
          ? parsed.queryParams.projectId[0]
          : parsed.queryParams?.projectId;
        if (!id) return;
        const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : "";
        const userIdParam = userId ? `&userId=${encodeURIComponent(userId)}` : "";
        router.replace(`/checklist?id=${encodeURIComponent(id)}${userIdParam}${projectIdParam}` as any);
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});

    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return null;
}
