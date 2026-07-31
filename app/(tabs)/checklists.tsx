import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Checklist,
  subscribeToChecklists,
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
  const { theme } = useTheme();
  const router = useRouter();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
    let unsubscribe: (() => void) | undefined;

    const bootstrap = async () => {
      const cached = await loadCachedChecklists(user.uid);
      if (cached.length > 0) {
        setChecklists(cached);
        setLoading(false);
      }

      unsubscribe = subscribeToChecklists(user.uid, (data) => {
        setChecklists(data);
        saveCachedChecklists(user.uid, data);
        setLoading(false);
      });

      await refreshPendingCount();
    };

    bootstrap();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, refreshPendingCount]);

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
    Alert.alert("Slet liste", `Er du sikker på du vil slette "${checklist.name}"?`, [
      { text: "Annuller", style: "cancel" },
      {
        text: "Slet",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteChecklistAndClearCache(checklist.id, user.uid);
            await refreshPendingCount();
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
        <Text style={styles.subtitle}>
          Opret lister fra Søg-fanen
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={isDark ? "#38bdf8" : "#0284c7"}
          style={{ marginTop: 40 }}
        />
      ) : checklists.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Ingen aktionslister endnu</Text>
          <Text style={styles.emptySubtitle}>
            Gå til Søg-fanen, søg efter noget, og tryk “Opret aktionsliste”.
          </Text>
        </View>
      ) : (
        <FlatList
          data={checklists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.checklistCard,
                !online && styles.offlineCard,
              ]}
              onPress={() => router.push(`/checklist?id=${item.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.checklistName} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  disabled={!online}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.deleteButton, !online && styles.disabledButton]}>🗑</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.checklistMeta}>
                {formatDate(item.updatedAt)} · {item.isDynamic ? "Dynamisk" : "Manuel"}
              </Text>
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
      marginBottom: 16,
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
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
      marginTop: 2,
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
