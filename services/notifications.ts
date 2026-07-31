import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === "web") return "undetermined";
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}

export async function scheduleLocalNotification(
  identifier: string,
  title: string,
  body: string,
  triggerDateMs: number,
  data?: Record<string, unknown>
): Promise<string> {
  const triggerDate = new Date(triggerDateMs);
  if (triggerDate.getTime() <= Date.now()) {
    // Don't schedule notifications in the past.
    return identifier;
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data: data || {},
      sound: "default",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return identifier;
}

export async function cancelScheduledNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function getScheduledNotificationIds(): Promise<string[]> {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications.map((n) => n.identifier);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Data Capture test",
      body: "Notifikationer virker!",
      sound: "default",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}
