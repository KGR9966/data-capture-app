import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import ReminderModal from "../components/ReminderModal";
import {
  Checklist,
  ChecklistItem,
  getChecklistById,
  shareChecklistText,
  subscribeToChecklistItems,
} from "../services/checklists";
import {
  compactPendingOps,
  deleteChecklistAndClearCache,
  flushPendingOps,
  getPendingOpsForChecklist,
  isOnline,
  loadCachedItems,
  PendingOp,
  saveCachedItems,
  toggleChecklistPointOffline,
} from "../services/checklistsOffline";
import {
  createReminder,
  deleteReminder,
  getRemindersForChecklist,
  Reminder,
  subscribeToReminders,
  updateReminder,
} from "../services/reminders";

function formatDate(ts: any) {
  if (!ts) return "";
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChecklistDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [sharing, setSharing] = useState(false);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderTargetItem, setReminderTargetItem] = useState<ChecklistItem | null>(null);
  const [reminderSaving, setReminderSaving] = useState(false);
  const checklistId = typeof id === "string" ? id : undefined;
  const pendingOpsRef = React.useRef<PendingOp[]>(pendingOps);

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);
  const [loading, setLoading] = useState(!checklistId);

  // Network state
  useEffect(() => {
    const check = async () => setOnline(await isOnline());
    check();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected =
        state.isConnected === true && state.isInternetReachable !== false;
      setOnline(connected);
    });
    return () => unsubscribe();
  }, []);

  const refreshPendingOps = async () => {
    if (!user?.uid || !checklistId) return;
    const ops = await getPendingOpsForChecklist(user.uid, checklistId);
    pendingOpsRef.current = ops;
    setPendingOps(ops);
  };

  const applyPendingOps = (
    serverItems: ChecklistItem[],
    ops: PendingOp[]
  ): ChecklistItem[] => {
    const byId = new Map(serverItems.map((i) => [i.id, { ...i }]));
    for (const op of ops) {
      if (op.type === "toggleChecklistItem") {
        const item = byId.get(op.payload.itemId as string);
        if (item) {
          item.isCompleted = op.payload.completed as boolean;
          item.isPending = true;
        }
      } else if (op.type === "updateChecklistItem") {
        const item = byId.get(op.payload.itemId as string);
        if (item) {
          Object.assign(item, op.payload.updates);
          item.isPending = true;
        }
      } else if (op.type === "deleteChecklistItem") {
        byId.delete(op.payload.itemId as string);
      } else if (op.type === "deleteChecklist") {
        return [];
      }
    }
    return Array.from(byId.values());
  };

  useEffect(() => {
    if (!checklistId) return;
    let unsubscribeItems: (() => void) | undefined;
    let unsubscribeReminders: (() => void) | undefined;

    const loadCachedAndServer = async () => {
      const cached = await loadCachedItems(checklistId);
      if (cached.length > 0) {
        setItems(cached);
        setLoading(false);
      }

      try {
        const data = await getChecklistById(checklistId);
        setChecklist(data);
        if (data) {
          unsubscribeItems = subscribeToChecklistItems(checklistId, (listItems) => {
            saveCachedItems(checklistId, listItems);
            const merged = applyPendingOps(listItems, pendingOpsRef.current);
            setItems(merged);
          });
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    loadCachedAndServer();

    if (user?.uid) {
      unsubscribeReminders = subscribeToReminders(user.uid, (all) => {
        setReminders(
          all.filter(
            (r) => r.targetType === "checklistItem" && r.targetId === checklistId
          )
        );
      });
      getRemindersForChecklist(user.uid, checklistId)
        .then((initial) => setReminders(initial))
        .catch(() => {});
      getPendingOpsForChecklist(user.uid, checklistId)
        .then((ops) => {
          pendingOpsRef.current = ops;
          setPendingOps(ops);
        })
        .catch(() => {});
    }

    return () => {
      if (unsubscribeItems) unsubscribeItems();
      if (unsubscribeReminders) unsubscribeReminders();
    };
  }, [checklistId, user?.uid]);

  const openItems = useMemo(
    () =>
      items
        .filter((i) => !i.isCompleted)
        .sort((a, b) => a.title.localeCompare(b.title, "da-DK")),
    [items]
  );

  const completedItems = useMemo(
    () =>
      items
        .filter((i) => i.isCompleted)
        .sort((a, b) => {
          const aTime = a.completedAt?.toMillis?.() || 0;
          const bTime = b.completedAt?.toMillis?.() || 0;
          return bTime - aTime;
        }),
    [items]
  );

  const sortedItems = useMemo(
    () => [...openItems, ...completedItems],
    [openItems, completedItems]
  );

  const handleToggleItem = async (item: ChecklistItem) => {
    if (!checklist || !user?.uid) return;
    const nextCompleted = !item.isCompleted;
    try {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, isCompleted: nextCompleted, isPending: true }
            : i
        )
      );
      const newOp = await toggleChecklistPointOffline(
        checklist,
        item,
        nextCompleted,
        user.uid
      );
      pendingOpsRef.current = compactPendingOps([...pendingOpsRef.current, newOp]);
      await refreshPendingOps();
    } catch {
      Alert.alert("Fejl", "Kunne ikke opdatere punktet.");
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isCompleted: item.isCompleted, isPending: false } : i
        )
      );
    }
  };

  const handleShare = async () => {
    if (!checklist) return;
    setSharing(true);
    try {
      await shareChecklistText(checklist, items);
    } catch {
      Alert.alert("Fejl", "Kunne ikke dele listen.");
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = () => {
    if (!checklist || !user?.uid) return;
    Alert.alert(
      "Slet liste",
      `Er du sikker på du vil slette "${checklist.name}"?`,
      [
        { text: "Annuller", style: "cancel" },
        {
          text: "Slet",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteChecklistAndClearCache(checklist.id, user.uid);
              router.back();
            } catch {
              Alert.alert("Fejl", "Kunne ikke slette listen.");
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      await flushPendingOps(user.uid);
      await refreshPendingOps();
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  const openReminderModal = (item: ChecklistItem) => {
    setReminderTargetItem(item);
    setReminderModalVisible(true);
  };

  const existingChecklistItemReminder = reminderTargetItem
    ? reminders.find(
        (r) =>
          r.targetType === "checklistItem" &&
          r.targetId === checklistId &&
          r.targetSubId === reminderTargetItem.id
      ) || null
    : null;

  const handleSaveReminder = async (payload: {
    scheduledAt: number;
    repeat: Reminder["repeat"];
    note?: string;
  }) => {
    if (!user?.uid || !checklistId || !reminderTargetItem || !checklist) return;
    setReminderSaving(true);
    try {
      if (existingChecklistItemReminder) {
        await updateReminder(user.uid, existingChecklistItemReminder.id, payload);
      } else {
        await createReminder({
          userId: user.uid,
          targetType: "checklistItem",
          targetId: checklistId,
          targetSubId: reminderTargetItem.id,
          title: reminderTargetItem.title || "Listepunkt",
          ...payload,
        });
      }
      setReminderModalVisible(false);
      setReminderTargetItem(null);
    } catch {
      Alert.alert("Fejl", "Kunne ikke gemme påmindelsen.");
    } finally {
      setReminderSaving(false);
    }
  };

  const handleDeleteReminder = async () => {
    if (!user?.uid || !existingChecklistItemReminder) return;
    setReminderSaving(true);
    try {
      await deleteReminder(user.uid, existingChecklistItemReminder.id);
      setReminderModalVisible(false);
      setReminderTargetItem(null);
    } catch {
      Alert.alert("Fejl", "Kunne ikke slette påmindelsen.");
    } finally {
      setReminderSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDark ? "#38bdf8" : "#0284c7"} />
      </View>
    );
  }

  if (!checklist) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Listen blev ikke fundet.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Tilbage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Tilbage</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerAction,
                (sharing || !online) && styles.buttonDisabled,
              ]}
              onPress={handleShare}
              disabled={sharing || !online}
            >
              <Text style={styles.headerActionText}>{sharing ? "Deler..." : "Del"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionDanger, !online && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={!online}
            >
              <Text style={styles.headerActionDangerText}>Slet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{checklist.name}</Text>
          {!online ? (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          ) : pendingOps.length > 0 ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Synkroniserer {pendingOps.length}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>
          {items.filter((i) => i.isCompleted).length} af {items.length} udført
          {checklist.syncStatusToSource !== false ? " · status synkroniseres til sagen" : ""}
        </Text>

        {sortedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Ingen punkter</Text>
            <Text style={styles.emptySubtitle}>
              Listen er tom. Opret nye punkter fra søgeresultater.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            renderItem={({ item }) => {
              const itemReminder = reminders.find(
                (r) =>
                  r.targetType === "checklistItem" &&
                  r.targetId === checklistId &&
                  r.targetSubId === item.id
              );
              return (
                <View
                  style={[
                    styles.itemCard,
                    item.isCompleted && styles.completedCard,
                    item.isPending && styles.pendingCard,
                    !online && styles.offlineCard,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleToggleItem(item)}
                    disabled={item.isPending}
                  >
                    <Text style={styles.checkboxText}>
                      {item.isCompleted ? "☑" : "☐"}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.itemContent}>
                    <View style={styles.itemTitleRow}>
                      <Text
                        style={[
                          styles.itemTitle,
                          item.isCompleted && styles.completedText,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <TouchableOpacity
                        style={styles.reminderIcon}
                        onPress={() => openReminderModal(item)}
                        disabled={reminderSaving}
                      >
                        <Ionicons
                          name={itemReminder ? "notifications" : "notifications-outline"}
                          size={18}
                          color={isDark ? "#38bdf8" : "#0284c7"}
                        />
                      </TouchableOpacity>
                    </View>
                    {item.notes ? (
                      <Text
                        style={[
                          styles.itemNotes,
                          item.isCompleted && styles.completedText,
                        ]}
                        numberOfLines={2}
                      >
                        {item.notes}
                      </Text>
                    ) : null}
                    {item.isPending ? (
                      <Text style={styles.pendingLabel}>Afventer synkronisering</Text>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => router.push(`/item?itemId=${item.sourceItemId}` as any)}
                    >
                      <Text style={styles.sourceLink}>Åbn sag →</Text>
                    </TouchableOpacity>
                    {item.isCompleted ? (
                      <Text style={styles.completedMeta}>
                        Udført {formatDate(item.completedAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
      {reminderTargetItem ? (
        <ReminderModal
          key={
            reminderModalVisible
              ? existingChecklistItemReminder?.id || reminderTargetItem.id
              : "closed"
          }
          visible={reminderModalVisible}
          title={reminderTargetItem.title || "Listepunkt"}
          existingReminder={existingChecklistItemReminder}
          saving={reminderSaving}
          onClose={() => {
            setReminderModalVisible(false);
            setReminderTargetItem(null);
          }}
          onSave={handleSaveReminder}
          onDelete={existingChecklistItemReminder ? handleDeleteReminder : undefined}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const themedStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      paddingTop: 60,
      paddingHorizontal: 16,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    backText: {
      color: "#38bdf8",
      fontSize: 16,
      fontWeight: "600",
    },
    headerActions: {
      flexDirection: "row",
      gap: 8,
    },
    headerAction: {
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headerActionText: {
      color: "#0f172a",
      fontWeight: "600",
      fontSize: 13,
    },
    headerActionDanger: {
      backgroundColor: "#f87171",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headerActionDangerText: {
      color: "#0f172a",
      fontWeight: "600",
      fontSize: 13,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 4,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    offlineBadge: {
      backgroundColor: isDark ? "#7c2d12" : "#fef3c7",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    offlineBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: isDark ? "#fdba74" : "#b45309",
    },
    pendingBadge: {
      backgroundColor: isDark ? "#1e3a8a" : "#dbeafe",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    pendingBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: isDark ? "#93c5fd" : "#1d4ed8",
    },
    subtitle: {
      fontSize: 13,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 16,
    },
    list: {
      paddingBottom: 24,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: "center",
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#1e293b",
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      textAlign: "center",
      paddingHorizontal: 24,
    },
    itemCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    completedCard: {
      opacity: 0.8,
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
    },
    checkbox: {
      padding: 4,
    },
    checkboxText: {
      fontSize: 22,
      color: "#38bdf8",
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 2,
      lineHeight: 20,
      flex: 1,
    },
    itemTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
    },
    reminderIcon: {
      padding: 4,
    },
    itemNotes: {
      fontSize: 13,
      color: isDark ? "#cbd5e1" : "#475569",
      lineHeight: 18,
      marginBottom: 4,
    },
    pendingCard: {
      borderColor: isDark ? "#0ea5e9" : "#38bdf8",
      borderStyle: "dashed",
    },
    offlineCard: {
      opacity: 0.85,
    },
    pendingLabel: {
      fontSize: 11,
      color: isDark ? "#38bdf8" : "#0284c7",
      marginBottom: 4,
    },
    completedText: {
      textDecorationLine: "line-through",
      color: isDark ? "#94a3b8" : "#64748b",
    },
    sourceLink: {
      fontSize: 12,
      color: "#38bdf8",
      fontWeight: "600",
      marginTop: 2,
    },
    completedMeta: {
      fontSize: 11,
      color: "#34d399",
      marginTop: 4,
    },
    notFound: {
      fontSize: 16,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    backButton: {
      marginTop: 16,
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      alignSelf: "flex-start",
    },
    backButtonText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
