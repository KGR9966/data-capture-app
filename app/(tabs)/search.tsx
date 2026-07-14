import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useVoiceRecognition } from "../../hooks/useVoiceRecognition";
import { CaptureItem, subscribeToItems } from "../../services/items";
import { subscribeToProjects } from "../../services/projects";

const ITEM_TYPE_LABELS: Record<string, string> = {
  idea: "Idé",
  observation: "Observation",
  bug: "Bug",
  comment: "Kommentar",
  photo: "Foto",
  voice: "Stemme",
  other: "Andet",
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

function formatCreator(item: CaptureItem) {
  if (item.createdByName) return item.createdByName;
  if (item.createdByEmail) return item.createdByEmail.split("@")[0];
  return "Mig";
}

function formatStatus(status: string) {
  switch (status) {
    case "new":
      return "Ny";
    case "in_progress":
      return "I gang";
    case "done":
      return "Færdig";
    case "archived":
      return "Arkiveret";
    default:
      return status;
  }
}

export default function SearchScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState<CaptureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [voiceActive, setVoiceActive] = useState(false);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMaxDurationTimer = () => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  };

  const { isRecording, startRecording, stopRecording } = useVoiceRecognition({
    locale: "da-DK",
    autoStopMs: 4000,
    onResult: (text, isFinal) => {
      if (isFinal && text) {
        const cleaned = text.replace(/[.,;!?]$/, "").trim();
        setQuery((prev) => {
          const base = prev.trim();
          return base ? `${base} ${cleaned}` : cleaned;
        });
      }
    },
    onError: (message) => {
      console.log("Search voice error", message);
      clearMaxDurationTimer();
      setVoiceActive(false);
    },
  });

  useEffect(() => {
    return () => {
      clearMaxDurationTimer();
    };
  }, []);

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribes: (() => void)[] = [];

    const projectsUnsubscribe = subscribeToProjects(
      user.uid,
      user.email || null,
      (projects) => {
        const itemUnsubscribes = projects.map((project) =>
          subscribeToItems(project.id, (items) => {
            setAllItems((prev) => {
              const others = prev.filter((i) => i.projectId !== project.id);
              return [...others, ...items];
            });
          })
        );
        unsubscribes.push(...itemUnsubscribes);
        setLoading(false);
      }
    );

    unsubscribes.push(projectsUnsubscribe);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.uid, user?.email]);

  const results = useMemo(() => {
    if (!query.trim()) return allItems;
    const terms = query
      .toLowerCase()
      .split(/[\s\-_,;|+]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (terms.length === 0) return allItems;

    return allItems
      .map((item) => {
        const fields = [
          item.title,
          item.content,
          item.category,
          ITEM_TYPE_LABELS[item.type],
          ...(item.tags || []),
        ]
          .filter((s): s is string => Boolean(s))
          .map((s) => s.toLowerCase());

        const matches = terms.filter((term) =>
          fields.some((field) => field.includes(term))
        ).length;
        return { item, matches };
      })
      .filter(({ matches }) => matches > 0)
      .sort((a, b) => b.matches - a.matches)
      .map(({ item }) => item);
  }, [query, allItems]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Søg</Text>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Søg efter titel, tekst, kategori, type eller flere ord..."
          placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[
            styles.voiceButton,
            (isRecording || voiceActive) && styles.voiceButtonActive,
          ]}
          onPress={async () => {
            if (isRecording) {
              clearMaxDurationTimer();
              await stopRecording();
              setVoiceActive(false);
            } else {
              setVoiceActive(true);
              clearMaxDurationTimer();
              maxDurationTimerRef.current = setTimeout(() => {
                stopRecording();
                setVoiceActive(false);
              }, 15000);
              await startRecording();
            }
          }}
          activeOpacity={0.7}
        >
          {isRecording || voiceActive ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.voiceButtonText}>🎤</Text>
          )}
        </TouchableOpacity>
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Text style={styles.clearButton}>Ryd</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.resultCount}>
        {loading ? "Indlæser..." : `${results.length} resultat${results.length === 1 ? "" : "er"}`}
      </Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Ingen resultater</Text>
            <Text style={styles.emptySubtitle}>
              {query.trim()
                ? "Prøv en anden søgning."
                : "Alle dine projekters indlæg vises her."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            onPress={() => router.push(`/item?itemId=${item.id}`)}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.typeText}>{ITEM_TYPE_LABELS[item.type] || item.type}</Text>
              {item.category ? (
                <Text style={styles.categoryText}>{item.category}</Text>
              ) : null}
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.content ? (
              <Text style={styles.itemContent} numberOfLines={2}>
                {item.content}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {formatDate(item.createdAt)} · {formatCreator(item)}
                {item.status ? ` · ${formatStatus(item.status)}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
    header: {
      fontSize: 28,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 16,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      marginBottom: 12,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    clearButton: {
      color: "#38bdf8",
      fontWeight: "600",
      paddingHorizontal: 4,
    },
    voiceButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 6,
    },
    voiceButtonActive: {
      backgroundColor: "#f87171",
    },
    voiceButtonText: {
      fontSize: 16,
    },
    resultCount: {
      fontSize: 13,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 12,
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
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 10,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    itemHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
      gap: 6,
    },
    typeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#38bdf8",
    },
    categoryText: {
      fontSize: 11,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 2,
      lineHeight: 20,
    },
    itemContent: {
      fontSize: 13,
      color: isDark ? "#cbd5e1" : "#475569",
      lineHeight: 18,
    },
    metaRow: {
      marginTop: 4,
    },
    metaText: {
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: 10,
    },
    statusText: {
      marginTop: 4,
      color: "#34d399",
      fontSize: 12,
      fontWeight: "700",
    },
  });
