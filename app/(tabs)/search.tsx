import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useVoiceRecognition } from "../../hooks/useVoiceRecognition";
import {
  ChecklistSortBy,
  createDynamicChecklistFromSearch,
  SourceField,
} from "../../services/checklists";
import { CaptureItem, subscribeToItems } from "../../services/items";
import { subscribeToProjects } from "../../services/projects";
import { searchItems } from "../../services/search";

const ITEM_TYPE_LABELS: Record<string, string> = {
  idea: "Idé",
  observation: "Observation",
  bug: "Fejl",
  note: "Notat",
  comment: "Notat",
  photo: "Foto",
  voice: "Stemme",
  other: "Andet",
};

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
  const [creatingChecklist, setCreatingChecklist] = useState(false);
  const [configVisible, setConfigVisible] = useState(false);
  const [listName, setListName] = useState("");
  const [sourceFields, setSourceFields] = useState<Record<SourceField, boolean>>({
    content: true,
    title: false,
    category: false,
  });
  const [sortBy, setSortBy] = useState<ChecklistSortBy>("alphabetical");
  const [syncStatus, setSyncStatus] = useState(true);
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
    return searchItems(allItems, query);
  }, [query, allItems]);

  const openConfigModal = () => {
    if (results.length === 0) return;
    setListName(`Søgning: ${query.trim() || "alle resultater"}`);
    setConfigVisible(true);
  };

  const closeConfigModal = () => {
    setConfigVisible(false);
  };

  const toggleSourceField = (field: SourceField) => {
    setSourceFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleCreateChecklist = async () => {
    const selectedFields = (Object.keys(sourceFields) as SourceField[]).filter(
      (f) => sourceFields[f]
    );
    if (selectedFields.length === 0) {
      Alert.alert("Vælg felter", "Vælg mindst ét kildefelt til punkterne.");
      return;
    }

    setCreatingChecklist(true);
    try {
      const { checklist } = await createDynamicChecklistFromSearch(
        listName.trim() || `Søgning: ${query.trim() || "alle resultater"}`,
        query.trim(),
        results,
        {
          sourceFields: selectedFields,
          sortBy,
          syncStatusToSource: syncStatus,
        }
      );
      setConfigVisible(false);
      router.push(`/checklist?id=${checklist.id}` as any);
    } catch (error) {
      console.log("Create checklist error", error);
      Alert.alert("Fejl", "Kunne ikke oprette den dynamiske liste.");
    } finally {
      setCreatingChecklist(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Søg</Text>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder={'Søg: *vand* "frase" type:note kategori:indkøb -kande OR flaske'}
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

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount}>
          {loading ? "Indlæser..." : `${results.length} resultat${results.length === 1 ? "" : "er"}`}
        </Text>
        {results.length > 0 ? (
          <TouchableOpacity
            style={[styles.createListButton, creatingChecklist && styles.buttonDisabled]}
            onPress={openConfigModal}
            disabled={creatingChecklist}
          >
            <Text style={styles.createListButtonText}>
              {creatingChecklist ? "Opretter..." : "Opret liste"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

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
              {item.mediaUrl ? (
                <View style={styles.photoBadge}>
                  <Text style={styles.photoBadgeText}>📷 Foto</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.content ? (
              <Text style={styles.itemContent} numberOfLines={2}>
                {item.content}
              </Text>
            ) : null}
            {item.assignedToName ? (
              <View style={styles.assigneeRow}>
                <Text style={styles.assigneeText}>👤 {item.assignedToName}</Text>
              </View>
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

      <Modal
        visible={configVisible}
        transparent
        animationType="slide"
        onRequestClose={closeConfigModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Opret dynamisk liste</Text>

              <Text style={styles.modalLabel}>Listens navn</Text>
              <TextInput
                style={styles.modalInput}
                value={listName}
                onChangeText={setListName}
                placeholder="Navn på listen"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              />

              <Text style={styles.modalLabel}>Felter til punkter</Text>
              {(["content", "title", "category"] as SourceField[]).map((field) => (
                <TouchableOpacity
                  key={field}
                  style={styles.optionRow}
                  onPress={() => toggleSourceField(field)}
                >
                  <Text style={styles.optionText}>
                    {sourceFields[field] ? "☑ " : "☐ "}
                    {field === "content"
                      ? "Beskrivelse / noter"
                      : field === "title"
                      ? "Titel"
                      : "Kategori"}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.modalLabel}>Sortering</Text>
              <View style={styles.sortRow}>
                {(["alphabetical", "date", "priority"] as ChecklistSortBy[]).map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={[
                      styles.sortButton,
                      sortBy === sort && styles.sortButtonActive,
                    ]}
                    onPress={() => setSortBy(sort)}
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

              <View style={styles.optionRow}>
                <Text style={styles.optionText}>Status-synk til kildesag</Text>
                <Switch
                  value={syncStatus}
                  onValueChange={setSyncStatus}
                  thumbColor={syncStatus ? "#38bdf8" : isDark ? "#94a3b8" : "#64748b"}
                  trackColor={{ false: "#475569", true: "#0ea5e9" }}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={closeConfigModal}
                >
                  <Text style={styles.modalButtonSecondaryText}>Annuller</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButtonPrimary,
                    creatingChecklist && styles.buttonDisabled,
                  ]}
                  onPress={handleCreateChecklist}
                  disabled={creatingChecklist}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    {creatingChecklist ? "Opretter..." : "Opret"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    resultHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    resultCount: {
      fontSize: 13,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    createListButton: {
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    createListButtonText: {
      color: "#0f172a",
      fontWeight: "600",
      fontSize: 12,
    },
    buttonDisabled: {
      opacity: 0.5,
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
    assigneeRow: {
      marginTop: 2,
      marginBottom: 2,
    },
    assigneeText: {
      color: "#38bdf8",
      fontSize: 12,
      fontWeight: "600",
    },
    statusText: {
      marginTop: 4,
      color: "#34d399",
      fontSize: 12,
      fontWeight: "700",
    },
    photoBadge: {
      marginLeft: "auto",
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    photoBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: isDark ? "#e2e8f0" : "#0f172a",
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
      marginBottom: 16,
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
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    optionText: {
      fontSize: 15,
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    sortRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    sortButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      alignItems: "center",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    sortButtonActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    sortButtonText: {
      fontSize: 13,
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
    sortButtonTextActive: {
      color: "#0f172a",
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
