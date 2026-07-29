import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Checklist,
  deleteChecklist,
  subscribeToChecklistItems,
  subscribeToProjectChecklists,
} from "../../services/checklists";
import { subscribeToProjects } from "../../services/projects";

interface ItemCounts {
  open: number;
  completed: number;
}

function formatDate(ts: any) {
  if (!ts) return "";
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(ts: any) {
  if (!ts) return "";
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChecklistsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, ItemCounts>>({});
  const [loading, setLoading] = useState(true);
  const checklistsRef = useRef(checklists);

  useEffect(() => {
    checklistsRef.current = checklists;
  }, [checklists]);

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);
  const checklistIds = checklists.map((c) => c.id).join(",");

  useEffect(() => {
    if (!user?.uid) return;

    const byProject = new Map<string, Checklist[]>();
    let projectIds: string[] = [];
    let unsubscribes: (() => void)[] = [];

    const mergeChecklists = () => {
      const merged = Array.from(byProject.values())
        .flat()
        .reduce<Map<string, Checklist>>((map, list) => {
          if (!map.has(list.id) || list.updatedAt?.toMillis?.() > map.get(list.id)!.updatedAt?.toMillis?.()) {
            map.set(list.id, list);
          }
          return map;
        }, new Map());
      const sorted = Array.from(merged.values()).sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setChecklists(sorted);
      setLoading(false);
    };

    const unsubscribeProjects = subscribeToProjects(
      user.uid,
      user.email ?? null,
      (projects) => {
        projectIds = projects.map((p) => p.id);

        // Genopret listeners for det nye projektsæt.
        unsubscribes.forEach((u) => u());
        unsubscribes = [];
        byProject.clear();

        if (projectIds.length === 0) {
          setChecklists([]);
          setLoading(false);
          return;
        }

        projectIds.forEach((projectId) => {
          const unsubscribe = subscribeToProjectChecklists(projectId, (data) => {
            byProject.set(projectId, data);
            mergeChecklists();
          });
          unsubscribes.push(unsubscribe);
        });
      }
    );

    return () => {
      unsubscribeProjects();
      unsubscribes.forEach((u) => u());
    };
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!user?.uid || checklistsRef.current.length === 0) return;
    const unsubscribes: (() => void)[] = [];

    for (const checklist of checklistsRef.current) {
      const unsubscribe = subscribeToChecklistItems(checklist.id, (items) => {
        const open = items.filter((i) => !i.isCompleted).length;
        const completed = items.filter((i) => i.isCompleted).length;
        setItemCounts((prev) => ({ ...prev, [checklist.id]: { open, completed } }));
      });
      unsubscribes.push(unsubscribe);
    }

    return () => {
      unsubscribes.forEach((u) => u());
    };
  }, [checklistIds, user?.uid]);

  const handleDelete = (checklist: Checklist) => {
    Alert.alert("Slet liste", `Er du sikker på du vil slette "${checklist.name}"?`, [
      { text: "Annuller", style: "cancel" },
      {
        text: "Slet",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteChecklist(checklist.id);
          } catch (error) {
            console.log("Delete checklist error", error);
            Alert.alert("Fejl", "Kunne ikke slette listen.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Lister</Text>
          <Text style={styles.subtitle}>Dine gemte lister og dynamiske søgninger</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/search")}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={isDark ? "#38bdf8" : "#0284c7"}
          style={{ marginTop: 40 }}
        />
      ) : checklists.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Ingen lister endnu</Text>
          <Text style={styles.emptySubtitle}>
            Gå til Søg-fanen, søg efter noget, og tryk “Opret liste”.
          </Text>
        </View>
      ) : (
        <FlatList
          data={checklists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.checklistCard}
              onPress={() => router.push(`/checklist?id=${item.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.checklistName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.badgeRow}>
                  {item.hasNewMatches ? (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>Nyt</Text>
                    </View>
                  ) : null}
                  {item.isDynamic ? (
                    <View style={styles.dynamicBadge}>
                      <Text style={styles.dynamicBadgeText}>Dynamisk</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text style={styles.checklistMeta}>
                {itemCounts[item.id]?.open ?? 0} åbne ·{" "}
                {itemCounts[item.id]?.completed ?? 0} udførte · Opdateret{" "}
                {formatDate(item.updatedAt)} {formatTime(item.updatedAt)}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>
                  {item.isDynamic
                    ? "Synkroniseres automatisk fra søgning"
                    : "Manuel liste"}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteButton}>🗑</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    header: {
      fontSize: 28,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 2,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#38bdf8",
      justifyContent: "center",
      alignItems: "center",
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
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
    },
    checklistName: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    badgeRow: {
      flexDirection: "row",
      gap: 6,
    },
    dynamicBadge: {
      backgroundColor: "#34d399",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    dynamicBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#0f172a",
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
    checklistMeta: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 6,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
    },
    cardFooterText: {
      fontSize: 11,
      color: isDark ? "#64748b" : "#94a3b8",
    },
    deleteButton: {
      fontSize: 16,
    },
  });
