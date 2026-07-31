import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import HighlightedText from "../../components/HighlightedText";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useVoiceRecognition } from "../../hooks/useVoiceRecognition";
import {
  ChecklistSortBy,
  createDynamicChecklistFromSearch,
  SourceField,
} from "../../services/checklists";
import { CaptureItem, subscribeToItems } from "../../services/items";
import { getProjectMembers, Project, subscribeToProjects } from "../../services/projects";
import { canCreateItem, getProjectRole } from "../../services/roles";
import { hasEnoughSearchLetters, searchItems } from "../../services/search";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<Record<string, any[]>>({});
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
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

  // Hent projekter
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribes: (() => void)[] = [];

    const projectsUnsubscribe = subscribeToProjects(
      user.uid,
      user.email || null,
      (projectsData) => {
        setProjects(projectsData);
      }
    );
    unsubscribes.push(projectsUnsubscribe);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.uid, user?.email]);

  // Hent items for brugerens projekter
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribes: (() => void)[] = [];

    const projectsUnsubscribe = subscribeToProjects(
      user.uid,
      user.email || null,
      (projectsData) => {
        const itemUnsubscribes = projectsData.map((project) =>
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

  // Hent projekt-medlemmer når projekter ændres
  const projectIds = useMemo(() => projects.map((p) => p.id).join(","), [projects]);
  useEffect(() => {
    if (!projectIds) return;
    const ids = projectIds.split(",");
    let cancelled = false;

    async function loadMembers() {
      const next: Record<string, any[]> = {};
      for (const projectId of ids) {
        try {
          next[projectId] = await getProjectMembers(projectId);
        } catch (err) {
          console.log("Load project members error", err);
          next[projectId] = [];
        }
      }
      if (!cancelled) setProjectMembers(next);
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [projectIds]);

  const canSearch = hasEnoughSearchLetters(query);

  const results = useMemo(() => {
    if (!canSearch) return [];
    return searchItems(allItems, query);
  }, [query, allItems, canSearch]);

  const projectResultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of results) {
      counts[item.projectId] = (counts[item.projectId] || 0) + 1;
    }
    return counts;
  }, [results]);

  const availableProjects = useMemo(() => {
    return projects.filter((p) => {
      const members = projectMembers[p.id] || [];
      const role = getProjectRole(p, user?.uid || null, members, user?.email || null);
      const canCreate = canCreateItem(role);
      return canCreate && (projectResultCounts[p.id] || 0) > 0;
    });
  }, [projects, projectMembers, user?.uid, projectResultCounts]);

  // Brug availableProjects som sandhedskilde for oprettelsesrettigheder,
  // så projektvælger og knap altid er synkroniserede.
  const canCreateChecklist = useMemo(() => {
    if (!selectedProjectId) return false;
    return availableProjects.some((p) => p.id === selectedProjectId);
  }, [selectedProjectId, availableProjects]);

  const openConfigModal = () => {
    if (results.length === 0) return;
    setListName(`Søgning: ${query.trim() || "alle resultater"}`);
    // Forvalg: første projekt med resultater som brugeren kan oprette i.
    setSelectedProjectId((prev) => {
      if (availableProjects.length === 1) return availableProjects[0].id;
      const stillValid = availableProjects.some((p) => p.id === prev);
      return stillValid ? prev : availableProjects[0]?.id;
    });
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

    if (projects.length > 1 && !selectedProjectId) {
      Alert.alert("Vælg projekt", "Vælg et projekt for listen.");
      return;
    }

    if (!selectedProjectId) {
      Alert.alert("Vælg projekt", "Vælg et projekt for listen.");
      return;
    }

    if (!canCreateChecklist) {
      Alert.alert(
        "Begrænset adgang",
        "Du har ikke rettigheder til at oprette liste i dette projekt."
      );
      return;
    }

    const trimmedName = listName.trim();
    if (trimmedName.length > 100) {
      Alert.alert("For langt navn", "Listens navn må højst være 100 tegn.");
      return;
    }

    setCreatingChecklist(true);
    console.log("[create checklist] query:", query, "results:", results.length, "selectedProjectId:", selectedProjectId);
    try {
      const { checklist } = await createDynamicChecklistFromSearch(
        trimmedName || `Søgning: ${query.trim() || "alle resultater"}`,
        query.trim(),
        results,
        {
          projectId: selectedProjectId,
          sourceFields: selectedFields,
          sortBy,
        }
      );
      setConfigVisible(false);
      router.push(`/checklist?id=${checklist.id}` as any);
    } catch (error) {
      console.log("Create checklist error", error);
      const message =
        error instanceof Error ? error.message : "Kunne ikke oprette den dynamiske liste.";
      Alert.alert("Fejl", mapCreateChecklistError(message));
    } finally {
      setCreatingChecklist(false);
    }
  };

  function mapCreateChecklistError(message: string): string {
    if (message.includes("Vælg et projekt")) return "Vælg et projekt for listen.";
    if (message.includes("Ingen søgeresultater tilhører"))
      return "Det valgte projekt har ingen af de viste søgeresultater. Vælg et andet projekt.";
    if (message.includes("Ingen søgeresultater at oprette"))
      return "Søgningen gav ingen resultater at oprette en liste af.";
    if (message.includes("permission-denied")) return "Du har ikke rettigheder til at oprette liste i dette projekt.";
    if (message.includes("unauthenticated")) return "Du er ikke logget ind. Log ind og prøv igen.";
    if (message.includes("network-request-failed") || message.includes("Network Error")) return "Tjek netværket og prøv igen.";
    // Vis den faktiske fejltekst for ukendte fejl, så vi kan identificere årsagen.
    return message || "Listen kunne ikke oprettes. Prøv igen.";
  }

  const renderEmptyState = () => {
    if (!canSearch && query.trim()) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Skriv mindst 2 tegn</Text>
          <Text style={styles.emptySubtitle}>
            Indtast mindst 2 tegn for at søge.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Ingen resultater</Text>
        <Text style={styles.emptySubtitle}>
          {query.trim()
            ? "Prøv en anden søgning."
            : "Alle dine projekters indlæg vises her."}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Søg</Text>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder={'Søg: Jem & Fix, 50 mm rør, æseløse...'}
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

      <Text style={styles.searchHint}>
        Almindelig tekst søger som delstreng. Brug &quot;...&quot; for præcis ord/phrase og *...* for hele-ord wildcard.
      </Text>

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount}>
          {loading ? "Indlæser..." : canSearch ? `${results.length} resultat${results.length === 1 ? "" : "er"}` : "Indtast mindst 2 tegn"}
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
        data={canSearch ? results : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmptyState()}
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
            <HighlightedText
              text={item.title}
              query={query}
              style={styles.itemTitle}
            />
            {item.content ? (
              <HighlightedText
                text={item.content}
                query={query}
                style={styles.itemContent}
                numberOfLines={2}
              />
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
                maxLength={100}
              />

              {availableProjects.length > 0 ? (
                <>
                  <Text style={styles.modalLabel}>Projekt</Text>
                  <View style={styles.projectList}>
                    {availableProjects.map((project) => {
                      const count = projectResultCounts[project.id] || 0;
                      return (
                        <TouchableOpacity
                          key={project.id}
                          style={[
                            styles.projectOption,
                            selectedProjectId === project.id && styles.projectOptionActive,
                          ]}
                          onPress={() => setSelectedProjectId(project.id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.projectOptionText,
                              selectedProjectId === project.id && styles.projectOptionTextActive,
                            ]}
                          >
                            {project.name}
                          </Text>
                          <Text style={styles.projectOptionHint}>{count} resultat{count === 1 ? "" : "er"}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

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
                    (creatingChecklist || !canCreateChecklist) && styles.buttonDisabled,
                  ]}
                  onPress={handleCreateChecklist}
                  disabled={creatingChecklist || !canCreateChecklist}
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
      marginBottom: 6,
    },
    searchHint: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 12,
      marginLeft: 2,
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
    projectList: {
      gap: 8,
    },
    projectOption: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
    },
    projectOptionActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    projectOptionDisabled: {
      opacity: 0.7,
    },
    projectOptionText: {
      fontSize: 15,
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
    projectOptionTextActive: {
      color: "#0f172a",
    },
    projectOptionTextDisabled: {
      color: isDark ? "#94a3b8" : "#64748b",
    },
    projectOptionHint: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 2,
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
