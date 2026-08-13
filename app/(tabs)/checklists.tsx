import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Checklist,
  createChecklist,
  subscribeToChecklists,
  subscribeToProjectChecklists,
} from "../../services/checklists";
import {
  deleteChecklistAndClearCache,
  flushPendingOps,
  getPendingOpsCount,
  isOnline,
  loadCachedChecklists,
  saveCachedChecklists,
} from "../../services/checklistsOffline";

function formatDate(ts: any) {
  if (!ts) return "";
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ChecklistsScreen() {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { theme } = useTheme();
  const router = useRouter();
  const [projectChecklistsById, setProjectChecklistsById] = useState<
    Record<string, Checklist[]>
  >({});
  const [personalChecklists, setPersonalChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"project" | "personal">("project");
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  const projectChecklists = activeProject?.id
    ? projectChecklistsById[activeProject.id] || []
    : [];

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  const refreshPendingCount = React.useCallback(async () => {
    if (!user?.uid) return;
    const count = await getPendingOpsCount(user.uid);
    setPendingCount(count);
  }, [user]);

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

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribes: (() => void)[] = [];
    let mounted = true;

    const bootstrap = async () => {
      const cached = await loadCachedChecklists(user.uid);
      if (cached.length > 0 && mounted) {
        setPersonalChecklists(cached);
        setLoading(false);
      }

      unsubscribes.push(
        subscribeToChecklists(user.uid, (data) => {
          if (!mounted) return;
          setPersonalChecklists(data);
          saveCachedChecklists(user.uid, data);
          setLoading(false);
        })
      );

      await refreshPendingCount();
    };

    bootstrap();
    return () => {
      mounted = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user, refreshPendingCount]);

  useEffect(() => {
    if (!activeProject?.id) return;
    const unsubscribe = subscribeToProjectChecklists(activeProject.id, (data) => {
      setProjectChecklistsById((prev) => ({ ...prev, [activeProject.id]: data }));
    });
    return () => unsubscribe();
  }, [activeProject?.id]);

  const handleRefresh = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      await flushPendingOps(user.uid);
      await refreshPendingCount();
    } catch (error) {
      console.log("Refresh checklists error", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (checklist: Checklist) => {
    if (!user?.uid) return;

    // Prevent deletion of shared lists the current user does not own.
    if (checklist.ownerId && checklist.ownerId !== user.uid) {
      Alert.alert("Begrænset adgang", "Du kan kun slette lister, du selv ejer.");
      return;
    }

    Alert.alert("Slet liste", `Er du sikker på du vil slette "${checklist.name}"?`, [
      { text: "Annuller", style: "cancel" },
      {
        text: "Slet",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteChecklistAndClearCache(checklist, user.uid);
            await refreshPendingCount();
          } catch (error) {
            const raw = error instanceof Error ? error.message : String(error);
            const code = (error as any)?.code || "unknown";
            console.error("[deleteChecklist] error:", { code, raw, error });
            Alert.alert(
              "Kunne ikke slette liste",
              `Fejl (${code}): ${raw}`
            );
          }
        },
      },
    ]);
  };

  const openCreateModal = () => {
    setNewListName("");
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setCreateModalVisible(false);
    setNewListName("");
  };

  const handleCreatePersonal = async () => {
    if (!user?.uid) return;
    const trimmed = newListName.trim();
    if (!trimmed) {
      Alert.alert("Navn mangler", "Angiv et navn til listen.");
      return;
    }
    setCreating(true);
    try {
      const checklist = await createChecklist(trimmed);
      closeCreateModal();
      router.push(`/checklist?id=${checklist.id}&userId=${user.uid}` as any);
    } catch (error) {
      console.error("Create personal checklist error", error);
      Alert.alert("Fejl", "Kunne ikke oprette listen.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.header}>Aktionslister</Text>
          {!online ? (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          ) : pendingCount > 0 ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount} afventer</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Text style={styles.subtitle}>
            Opret lister fra Søg-fanen
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Text style={styles.addButtonText}>+ Ny</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "project" && styles.tabActive]}
          onPress={() => setActiveTab("project")}
        >
          <Text style={[styles.tabText, activeTab === "project" && styles.tabTextActive]}>Projekt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "personal" && styles.tabActive]}
          onPress={() => setActiveTab("personal")}
        >
          <Text style={[styles.tabText, activeTab === "personal" && styles.tabTextActive]}>Mine / delte</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={isDark ? "#38bdf8" : "#0284c7"}
          style={{ marginTop: 40 }}
        />
      ) : activeTab === "project" && projectChecklists.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Ingen projekt-lister</Text>
          <Text style={styles.emptySubtitle}>
            Gå til Søg-fanen, søg efter noget, og tryk “Opret aktionsliste”.
          </Text>
        </View>
      ) : activeTab === "personal" && personalChecklists.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Ingen personlige eller delte lister</Text>
          <Text style={styles.emptySubtitle}>
            Gå til Søg-fanen og opret en liste uden at vælge projekt.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === "project" ? projectChecklists : personalChecklists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            activeTab === "personal" ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Ingen personlige lister</Text>
                <TouchableOpacity style={styles.createEmptyButton} onPress={openCreateModal}>
                  <Text style={styles.createEmptyButtonText}>Opret personlig liste</Text>
                </TouchableOpacity>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.checklistCard,
                !online && styles.offlineCard,
              ]}
              onPress={() => {
                if (item.projectId) {
                  router.push(
                    `/checklist?id=${item.id}&projectId=${encodeURIComponent(item.projectId)}` as any
                  );
                } else {
                  router.push(
                    `/checklist?id=${item.id}&userId=${item.ownerId || user?.uid}` as any
                  );
                }
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.checklistName} numberOfLines={1}>
                  {item.name}
                </Text>
                {(item.ownerId === user?.uid) ? (
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    disabled={!online}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.deleteButton, !online && styles.disabledButton]}>🗑</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.checklistMeta}>
                {formatDate(item.updatedAt)} · {item.isDynamic ? "Dynamisk" : "Manuel"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ny personlig liste</Text>
            <TextInput
              style={styles.modalInput}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="Navn på listen"
              placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              maxLength={100}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={closeCreateModal}>
                <Text style={styles.modalButtonSecondaryText}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonPrimary, creating && styles.buttonDisabled]}
                onPress={handleCreatePersonal}
                disabled={creating}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {creating ? "Opretter..." : "Opret"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
      marginBottom: 16,
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
    },
    addButton: {
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    addButtonText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 13,
    },
    createEmptyButton: {
      marginTop: 12,
      backgroundColor: "#38bdf8",
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    createEmptyButtonText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 14,
    },
    header: {
      fontSize: 28,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
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
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingHorizontal: 24,
    },
    modalContent: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 12,
    },
    modalInput: {
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      color: isDark ? "#e2e8f0" : "#0f172a",
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 10,
    },
    modalButtonPrimary: {
      flex: 1,
      backgroundColor: "#38bdf8",
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    modalButtonPrimaryText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    modalButtonSecondary: {
      flex: 1,
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    modalButtonSecondaryText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    tabRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      alignItems: "center",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    tabActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    tabText: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    tabTextActive: {
      color: "#0f172a",
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "700",
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 8,
      marginBottom: 8,
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
    checklistCard: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    offlineCard: {
      opacity: 0.85,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    checklistName: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    checklistMeta: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 4,
    },
    deleteButton: {
      fontSize: 16,
    },
    disabledButton: {
      opacity: 0.4,
    },
  });
