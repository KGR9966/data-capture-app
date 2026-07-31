import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import { db } from "./firebase";
import {
  cancelScheduledNotification,
  scheduleLocalNotification,
} from "./notifications";

export type ReminderRepeat = "once" | "daily" | "weekly";
export type ReminderTargetType = "item" | "checklistItem";

export interface Reminder {
  id: string;
  userId: string;
  targetType: ReminderTargetType;
  targetId: string;
  targetSubId?: string;
  title: string;
  note?: string;
  scheduledAt: number; // epoch ms
  repeat: ReminderRepeat;
  notificationId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ReminderInput {
  userId: string;
  targetType: ReminderTargetType;
  targetId: string;
  targetSubId?: string;
  title: string;
  note?: string;
  scheduledAt: number;
  repeat: ReminderRepeat;
}

function remindersCollection(userId: string) {
  return collection(db, "users", userId, "reminders");
}

function reminderDoc(userId: string, reminderId: string) {
  return doc(db, "users", userId, "reminders", reminderId);
}

export function reminderNotificationId(reminderId: string): string {
  return `reminder:${reminderId}`;
}

function buildNotificationBody(reminder: Reminder | ReminderInput): string {
  if (reminder.note && reminder.note.trim()) {
    return reminder.note.trim();
  }
  return reminder.targetType === "item"
    ? "Påmindelse om sagen."
    : "Påmindelse om listepunktet.";
}

export function subscribeToReminders(
  userId: string,
  callback: (reminders: Reminder[]) => void
) {
  const q = query(remindersCollection(userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const reminders = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Reminder, "id">),
      }));
      callback(reminders);
    },
    (error) => {
      console.error("[subscribeToReminders] error:", error);
      callback([]);
    }
  );
}

export async function getRemindersForItem(
  userId: string,
  itemId: string
): Promise<Reminder[]> {
  const q = query(
    remindersCollection(userId),
    where("targetType", "==", "item"),
    where("targetId", "==", itemId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Reminder, "id">) }));
}

export async function getRemindersForChecklistItem(
  userId: string,
  checklistId: string,
  itemId: string
): Promise<Reminder[]> {
  const q = query(
    remindersCollection(userId),
    where("targetType", "==", "checklistItem"),
    where("targetId", "==", checklistId),
    where("targetSubId", "==", itemId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Reminder, "id">) }));
}

export async function getRemindersForChecklist(
  userId: string,
  checklistId: string
): Promise<Reminder[]> {
  const q = query(
    remindersCollection(userId),
    where("targetType", "==", "checklistItem"),
    where("targetId", "==", checklistId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Reminder, "id">) }));
}

export async function createReminder(input: ReminderInput): Promise<Reminder> {
  const docRef = await addDoc(remindersCollection(input.userId), {
    ...input,
    title: input.title.trim(),
    note: input.note?.trim() || undefined,
    notificationId: reminderNotificationId("pending"),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const notificationId = reminderNotificationId(docRef.id);
  await updateDoc(docRef, { notificationId });

  const reminder: Reminder = {
    id: docRef.id,
    ...input,
    title: input.title.trim(),
    note: input.note?.trim() || undefined,
    notificationId,
  };

  try {
    await scheduleLocalNotification(
      notificationId,
      reminder.title,
      buildNotificationBody(reminder),
      reminder.scheduledAt,
      {
        reminderId: reminder.id,
        targetType: reminder.targetType,
        targetId: reminder.targetId,
        targetSubId: reminder.targetSubId,
      }
    );
  } catch (error) {
    console.error("[createReminder] failed to schedule local notification:", error);
  }

  return reminder;
}

export async function updateReminder(
  userId: string,
  reminderId: string,
  updates: Partial<Pick<Reminder, "title" | "note" | "scheduledAt" | "repeat">>
): Promise<void> {
  const ref = reminderDoc(userId, reminderId);
  const normalized: Record<string, unknown> = {};
  if (updates.title !== undefined) normalized.title = updates.title.trim();
  if (updates.note !== undefined) normalized.note = updates.note?.trim() || undefined;
  if (updates.scheduledAt !== undefined) normalized.scheduledAt = updates.scheduledAt;
  if (updates.repeat !== undefined) normalized.repeat = updates.repeat;
  normalized.updatedAt = serverTimestamp();

  await updateDoc(ref, normalized);

  // If the time or title changed, we need to reschedule. Firestore subscription will
  // eventually reflect the change, but we reschedule eagerly here so the local
  // notification is up-to-date immediately.
  if (updates.scheduledAt !== undefined || updates.title !== undefined || updates.note !== undefined) {
    try {
      const snap = await getDocs(query(remindersCollection(userId), where("__name__", "==", reminderId)));
      const current = snap.docs[0]?.data() as Omit<Reminder, "id"> | undefined;
      if (!current) return;
      await scheduleLocalNotification(
        current.notificationId,
        current.title,
        buildNotificationBody(current),
        current.scheduledAt,
        {
          reminderId,
          targetType: current.targetType,
          targetId: current.targetId,
          targetSubId: current.targetSubId,
        }
      );
    } catch (error) {
      console.error("[updateReminder] failed to reschedule local notification:", error);
    }
  }
}

export async function deleteReminder(userId: string, reminderId: string): Promise<void> {
  await cancelScheduledNotification(reminderNotificationId(reminderId));
  await deleteDoc(reminderDoc(userId, reminderId));
}

export async function deleteRemindersForItem(
  userId: string,
  itemId: string
): Promise<void> {
  const reminders = await getRemindersForItem(userId, itemId);
  await Promise.all(reminders.map((r) => deleteReminder(userId, r.id)));
}

export async function deleteRemindersForChecklistItem(
  userId: string,
  checklistId: string,
  itemId: string
): Promise<void> {
  const reminders = await getRemindersForChecklistItem(userId, checklistId, itemId);
  await Promise.all(reminders.map((r) => deleteReminder(userId, r.id)));
}

export async function deleteRemindersForChecklist(
  userId: string,
  checklistId: string
): Promise<void> {
  const reminders = await getRemindersForChecklist(userId, checklistId);
  await Promise.all(reminders.map((r) => deleteReminder(userId, r.id)));
}
