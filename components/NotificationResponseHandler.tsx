import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useEffect, useRef } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function NotificationResponseHandler() {
  const router = useRouter();
  const hasInitialised = useRef(false);

  useEffect(() => {
    if (hasInitialised.current) return;
    hasInitialised.current = true;

    let subscription: Notifications.Subscription | undefined;

    const init = async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last?.notification?.request?.content?.data) {
          handleResponse(last.notification.request.content.data, router);
        }
      } catch (error) {
        console.error("[NotificationResponseHandler] getLastNotificationResponseAsync error:", error);
      }

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        handleResponse(data, router);
      });
    };

    init();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [router]);

  return null;
}

function handleResponse(
  data: Record<string, unknown> | undefined,
  router: ReturnType<typeof useRouter>
) {
  if (!data) return;

  const targetType = data.targetType as string | undefined;
  const targetId = data.targetId as string | undefined;
  const targetProjectId = data.targetProjectId as string | undefined;
  const targetSubId = data.targetSubId as string | undefined;

  if (!targetType || !targetId) return;

  if (targetType === "item") {
    if (!targetProjectId) {
      Alert.alert("Påmindelsen peger på en sag uden projekt-id.");
      return;
    }
    router.push(`/item?itemId=${targetId}&projectId=${targetProjectId}` as any);
  } else if (targetType === "checklistItem") {
    const projectIdParam = targetProjectId ? `&projectId=${encodeURIComponent(targetProjectId)}` : "";
    router.push(`/checklist?id=${targetId}${projectIdParam}` as any);
  } else if (targetType === "checklist" && targetSubId) {
    const projectIdParam = targetProjectId ? `&projectId=${encodeURIComponent(targetProjectId)}` : "";
    router.push(`/checklist?id=${targetId}${projectIdParam}` as any);
  }
}
