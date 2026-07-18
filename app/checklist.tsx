import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  Checklist,
  ChecklistItem,
  deleteChecklist,
  getChecklistById,
  shareChecklistText,
  subscribeToChecklistItems,
  toggleChecklistItemComplete,
} from "../services/checklists";

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
  const checklistId = typeof id === "string" ? id : undefined;

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);
  const [loading, setLoading] = useState(!checklistId);

  useEffect(() => {
    if (!checklistId) return;
    let unsubscribeItems: (() => void) | undefined;
    getChecklistById(checklistId)
      .then((data) => {
        setChecklist(data);
        if (data) {
          unsubscribeItems = subscribeToChecklistItems(checklistId, (listItems) => {
            setItems(listItems);
          });
        }
      })
      .catch(console.log)
      .finally(() => setLoading(false));

    return () => {
      if (unsubscribeItems) unsubscribeItems();
    };
  }, [checklistId]);

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
    try {
      await toggleChecklistItemComplete(checklist, item, user.uid);
    } catch (error) {
      console.log("Toggle item error", error);
      Alert.alert("Fejl", "Kunne ikke opdatere punktet.");
    }
  };

  const handleShare = async () => {
    if (!checklist) return;
    setSharing(true);
    try {
      await shareChecklistText(checklist, items);
    } catch (error) {
      console.log("Share checklist error", error);
      Alert.alert("Fejl", "Kunne ikke dele listen.");
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = () => {
    if (!checklist) return;
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
              await deleteChecklist(checklist.id);
              router.back();
            } catch (error) {
              console.log("Delete checklist error", error);
              Alert.alert("Fejl", "Kunne ikke slette listen.");
            }
          },
        },
      ]
    );
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
              style={[styles.headerAction, sharing && styles.buttonDisabled]}
              onPress={handleShare}
              disabled={sharing}
            >
              <Text style={styles.headerActionText}>{sharing ? "Deler..." : "Del"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionDanger} onPress={handleDelete}>
              <Text style={styles.headerActionDangerText}>Slet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>{checklist.name}</Text>
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
            renderItem={({ item }) => (
              <View
                style={[
                  styles.itemCard,
                  item.isCompleted && styles.completedCard,
                ]}
              >
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleToggleItem(item)}
                >
                  <Text style={styles.checkboxText}>
                    {item.isCompleted ? "☑" : "☐"}
                  </Text>
                </TouchableOpacity>
                <View style={styles.itemContent}>
                  <Text
                    style={[
                      styles.itemTitle,
                      item.isCompleted && styles.completedText,
                    ]}
                  >
                    {item.title}
                  </Text>
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
            )}
          />
        )}
      </View>
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
    },
    itemNotes: {
      fontSize: 13,
      color: isDark ? "#cbd5e1" : "#475569",
      lineHeight: 18,
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
