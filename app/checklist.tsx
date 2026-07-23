import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { buildChecklistUrl, copyToClipboard } from "../services/deeplinks";
import { getProjectById, getProjectMembers } from "../services/projects";
import { getProjectRole } from "../services/roles";
import { CaptureItem, subscribeToItems } from "../services/items";
import {
  addManualItemToChecklist,
  Checklist,
  ChecklistItem,
  ChecklistSortBy,
  deleteChecklist,
  deleteChecklistItemAndTrack,
  getChecklistById,
  markChecklistAsViewed,
  shareChecklistText,
  subscribeToChecklistItems,
  synchronizeDynamicChecklist,
  toggleChecklistItemComplete,
  updateChecklist,
  updateChecklistItem,
} from "../services/checklists";

const SORT_LABELS: Record<ChecklistSortBy, string> = {
  alphabetical: "Alfabetisk",
  date: "Dato",
  priority: "Prioritet",
};

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

function sortChecklistItems(
  items: ChecklistItem[],
  sortBy: ChecklistSortBy
): ChecklistItem[] {
  const open = items.filter((i) => !i.isCompleted);
  const completed = items.filter((i) => i.isCompleted);

  const sortOpen = (a: ChecklistItem, b: ChecklistItem): number => {
    switch (sortBy) {
      case "date":
        return (
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );
      case "priority":
        return (b.priority || 1) - (a.priority || 1);
      case "alphabetical":
      default:
        return a.title.localeCompare(b.title, "da-DK");
    }
  };

  open.sort(sortOpen);
  completed.sort((a, b) => {
    const aTime = a.completedAt?.toMillis?.() || 0;
    const bTime = b.completedAt?.toMillis?.() || 0;
    return bTime - aTime;
  });

  return [...open, ...completed];
}

export default function ChecklistDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [projectItems, setProjectItems] = useState<CaptureItem[]>([]);
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [sortBy, setSortBy] = useState<ChecklistSortBy>("alphabetical");
  const checklistId = typeof id === "string" ? id : undefined;
  const [loading, setLoading] = useState(!!checklistId);

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  // Load checklist and verify access
  useEffect(() => {
    if (!checklistId) return;

    let unsubscribeItems: (() => void) | undefined;
    let unsubscribeProjectItems: (() => void) | undefined;

    getChecklistById(checklistId)
      .then(async (data) => {
        setChecklist(data);
        if (data) {
          setSortBy(data.sortBy || "alphabetical");

          // Verify access for deep-link / shared opens
          if (user?.uid && data.ownerId !== user.uid && data.projectId) {
            const [project, members] = await Promise.all([
              getProjectById(data.projectId),
              getProjectMembers(data.projectId),
            ]);
            const role = getProjectRole(project, user.uid, members);
            if (!role) {
              setAccessDenied(true);
              setLoading(false);
              return;
            }
          }

          unsubscribeItems = subscribeToChecklistItems(checklistId, (listItems) => {
            setItems(listItems);
          });

          if (data.isDynamic && data.projectId && user?.uid) {
            unsubscribeProjectItems = subscribeToItems(data.projectId, (projItems) => {
              setProjectItems(projItems);
            });
          }

          await markChecklistAsViewed(checklistId);
        }
      })
      .catch(console.log)
      .finally(() => setLoading(false));

    return () => {
      if (unsubscribeItems) unsubscribeItems();
      if (unsubscribeProjectItems) unsubscribeProjectItems();
    };
  }, [checklistId, user?.uid]);

  // Sync dynamic checklist against current project items whenever they change
  useEffect(() => {
    if (!checklist || !checklist.isDynamic || !projectItems.length) return;
    synchronizeDynamicChecklist(checklist, projectItems).catch((error) =>
      console.log("Sync checklist error", error)
    );
  }, [checklist, projectItems]);

  const sortedItems = useMemo(() => {
    return sortChecklistItems(items, sortBy);
  }, [items, sortBy]);

  const completedCount = useMemo(
    () => items.filter((i) => i.isCompleted).length,
    [items]
  );

  const openCount = items.length - completedCount;

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

  const handleCopyLink = async () => {
    if (!checklist) return;
    setCopying(true);
    try {
      await copyToClipboard(buildChecklistUrl(checklist.id));
      Alert.alert("Kopieret", "Linket er kopieret til udklipsholderen.");
    } catch (error) {
      console.log("Copy link error", error);
      Alert.alert("Fejl", "Kunne ikke kopiere linket.");
    } finally {
      setCopying(false);
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

  const handleSortChange = async (nextSort: ChecklistSortBy) => {
    setSortBy(nextSort);
    if (checklist && checklist.sortBy !== nextSort) {
      try {
        await updateChecklist(checklist.id, { sortBy: nextSort });
      } catch (error) {
        console.log("Update sort error", error);
      }
    }
  };

  const openEditModal = (item: ChecklistItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditNotes(item.notes || "");
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setEditTitle("");
    setEditNotes("");
  };

  const saveEdit = async () => {
    if (!checklist || !editingItem) return;
    try {
      await updateChecklistItem(checklist.id, editingItem.id, {
        title: editTitle.trim(),
        notes: editNotes.trim(),
      });
      closeEditModal();
    } catch (error) {
      console.log("Update item error", error);
      Alert.alert("Fejl", "Kunne ikke opdatere punktet.");
    }
  };

  const handleDeleteItem = (item: ChecklistItem) => {
    if (!checklist) return;
    Alert.alert("Slet punkt", `Slet "${item.title}"?`, [
      { text: "Annuller", style: "cancel" },
      {
        text: "Slet",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteChecklistItemAndTrack(checklist, item);
          } catch (error) {
            console.log("Delete item error", error);
            Alert.alert("Fejl", "Kunne ikke slette punktet.");
          }
        },
      },
    ]);
  };

  const handleAddItem = async () => {
    if (!checklist || !newItemTitle.trim()) return;
    setAdding(true);
    try {
      await addManualItemToChecklist(
        checklist,
        newItemTitle.trim(),
        newItemNotes.trim()
      );
      setNewItemTitle("");
      setNewItemNotes("");
      setAddModalVisible(false);
    } catch (error) {
      console.log("Add item error", error);
      Alert.alert("Fejl", "Kunne ikke tilføje punktet.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDark ? "#38bdf8" : "#0284c7"} />
      </View>
    );
  }

  if (accessDenied) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Du har ikke adgang til denne liste.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Tilbage</Text>
        </TouchableOpacity>
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
              <Text style={styles.headerActionText}>
                {sharing ? "Deler..." : "Del"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerAction, copying && styles.buttonDisabled]}
              onPress={handleCopyLink}
              disabled={copying}
            >
              <Text style={styles.headerActionText}>
                {copying ? "..." : "Link"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionDanger}
              onPress={handleDelete}
            >
              <Text style={styles.headerActionDangerText}>Slet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>{checklist.name}</Text>
        <Text style={styles.subtitle}>
          {completedCount} af {items.length} udført · {openCount} åbne
          {checklist.syncStatusToSource !== false
            ? " · status synkroniseres til sagen"
            : ""}
        </Text>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sorter:</Text>
          {( ["alphabetical", "date", "priority"] as ChecklistSortBy[]).map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[
                styles.sortButton,
                sortBy === sort && styles.sortButtonActive,
              ]}
              onPress={() => handleSortChange(sort)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === sort && styles.sortButtonTextActive,
                ]}
              >
                {SORT_LABELS[sort]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {checklist.isDynamic ? (
          <View style={styles.addRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+ Tilføj punkt</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {sortedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Ingen punkter</Text>
            <Text style={styles.emptySubtitle}>
              {checklist.isDynamic
                ? "Listen opdateres automatisk, når sager matcher søgningen."
                : "Listen er tom."}
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
                  item.isStale && styles.staleCard,
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
                  <View style={styles.itemTitleRow}>
                    <Text
                      style={[
                        styles.itemTitle,
                        item.isCompleted && styles.completedText,
                        item.isStale && styles.staleText,
                      ]}
                    >
                      {item.title}
                    </Text>
                    {item.isNewMatch ? (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>Nyt match</Text>
                      </View>
                    ) : null}
                    {item.isDuplicate ? (
                      <View style={styles.duplicateBadge}>
                        <Text style={styles.duplicateBadgeText}>
                          Måske duplikat
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {item.notes ? (
                    <Text
                      style={[
                        styles.itemNotes,
                        item.isCompleted && styles.completedText,
                        item.isStale && styles.staleText,
                      ]}
                      numberOfLines={2}
                    >
                      {item.notes}
                    </Text>
                  ) : null}
                  {item.isStale ? (
                    <Text style={styles.staleNote}>
                      {item.staleNote || "Kilden matcher ikke længere søgningen"}
                    </Text>
                  ) : null}
                  {item.sourceItemId && item.sourceItemId !== "manual" ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/item?itemId=${item.sourceItemId}` as any)
                      }
                    >
                      <Text style={styles.sourceLink}>Åbn sag →</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.isCompleted ? (
                    <Text style={styles.completedMeta}>
                      Udført {formatDate(item.completedAt)}
                    </Text>
                  ) : null}
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      style={styles.itemAction}
                    >
                      <Text style={styles.itemActionText}>Rediger</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item)}
                      style={styles.itemActionDanger}
                    >
                      <Text style={styles.itemActionDangerText}>Slet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Edit item modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Rediger punkt</Text>
              <Text style={styles.modalLabel}>Titel</Text>
              <TextInput
                style={styles.modalInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Punktets titel"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              />
              <Text style={styles.modalLabel}>Noter</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Noter (valgfrit)"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={closeEditModal}
                >
                  <Text style={styles.modalButtonSecondaryText}>Annuller</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonPrimary} onPress={saveEdit}>
                  <Text style={styles.modalButtonPrimaryText}>Gem</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add item modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Tilføj punkt</Text>
              <Text style={styles.modalHelper}>
                Der oprettes automatisk en sag, der matcher listens søgning.
              </Text>
              <Text style={styles.modalLabel}>Titel</Text>
              <TextInput
                style={styles.modalInput}
                value={newItemTitle}
                onChangeText={setNewItemTitle}
                placeholder="Ny sag / punkt"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              />
              <Text style={styles.modalLabel}>Noter</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                value={newItemNotes}
                onChangeText={setNewItemNotes}
                placeholder="Noter (valgfrit)"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setAddModalVisible(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>Annuller</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButtonPrimary,
                    (!newItemTitle.trim() || adding) && styles.buttonDisabled,
                  ]}
                  onPress={handleAddItem}
                  disabled={!newItemTitle.trim() || adding}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    {adding ? "Tilføjer..." : "Tilføj"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      marginBottom: 12,
    },
    sortRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      flexWrap: "wrap",
    },
    sortLabel: {
      fontSize: 13,
      color: isDark ? "#94a3b8" : "#64748b",
      fontWeight: "600",
    },
    sortButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    sortButtonActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    sortButtonText: {
      fontSize: 12,
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
    sortButtonTextActive: {
      color: "#0f172a",
    },
    addRow: {
      marginBottom: 12,
    },
    addButton: {
      backgroundColor: "#34d399",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: "flex-start",
    },
    addButtonText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 13,
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
    staleCard: {
      borderColor: isDark ? "#475569" : "#cbd5e1",
      backgroundColor: isDark ? "#1e293b" : "#f8fafc",
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
    itemTitleRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      marginBottom: 2,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
      lineHeight: 20,
      flexShrink: 1,
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
    staleText: {
      color: isDark ? "#64748b" : "#94a3b8",
    },
    staleNote: {
      fontSize: 11,
      color: isDark ? "#94a3b8" : "#64748b",
      fontStyle: "italic",
      marginBottom: 4,
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
    itemActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    itemAction: {
      paddingVertical: 4,
    },
    itemActionText: {
      fontSize: 12,
      color: "#38bdf8",
      fontWeight: "600",
    },
    itemActionDanger: {
      paddingVertical: 4,
    },
    itemActionDangerText: {
      fontSize: 12,
      color: "#f87171",
      fontWeight: "600",
    },
    newBadge: {
      backgroundColor: "#f87171",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    newBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#0f172a",
    },
    duplicateBadge: {
      backgroundColor: "#fbbf24",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    duplicateBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#0f172a",
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "85%",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 8,
    },
    modalHelper: {
      fontSize: 13,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 12,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 12,
      marginBottom: 8,
    },
    modalInput: {
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: isDark ? "#e2e8f0" : "#0f172a",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    modalInputMultiline: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 20,
    },
    modalButtonPrimary: {
      backgroundColor: "#38bdf8",
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    modalButtonPrimaryText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    modalButtonSecondary: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    modalButtonSecondaryText: {
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: 15,
      fontWeight: "600",
    },
  });
