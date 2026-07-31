import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  TouchableOpacity,
  View,
} from "react-native";

import CreateItemForm, {
  deriveTitle,
  ITEM_TYPE_COLORS,
  ITEM_TYPE_LABELS,
} from "../../components/CreateItemForm";
import VoiceCaptureModal from "../../components/VoiceCaptureModal";
import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";
import { useTheme } from "../../contexts/ThemeContext";
import { suggestCategory } from "../../services/categories";
import { buildBoardUrl, copyToClipboard } from "../../services/deeplinks";
import { CaptureItem, createItem, ItemType, subscribeToItems } from "../../services/items";
import {
  pickImage,
  takePhoto,
  uploadImage,
} from "../../services/media";
import { ProjectMember, subscribeToProjectMembers } from "../../services/projects";
import { canAssignItems, getProjectRole, ProjectRole } from "../../services/roles";

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

export default function BoardScreen() {
  const { user } = useAuth();
  const { activeProject, loading: projectLoading } = useProject();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [items, setItems] = useState<CaptureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [itemType, setItemType] = useState<ItemType>("idea");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [assignedToName, setAssignedToName] = useState<string>("");

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  const projectRole: ProjectRole | null = activeProject
    ? getProjectRole(activeProject, user?.uid, members)
    : null;

  const filterCategory =
    typeof params.category === "string" ? params.category : undefined;
  const filterStatus =
    typeof params.status === "string" ? params.status : undefined;

  const filteredItems = items.filter((item) => {
    if (filterCategory && item.category !== filterCategory) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    if (showArchived) return item.status === "archived";
    return item.status !== "archived";
  });

  useEffect(() => {
    if (!activeProject) return;
    const unsubscribeItems = subscribeToItems(activeProject.id, (data) => {
      setItems(data);
      setLoading(false);
    });
    const unsubscribeMembers = subscribeToProjectMembers(activeProject.id, (data) => {
      setMembers(data);
    });
    return () => {
      unsubscribeItems();
      unsubscribeMembers();
    };
  }, [activeProject]);

  const resetManualForm = () => {
    setItemType("idea");
    setTitle("");
    setContent("");
    setCategory("");
    setMediaUrl(null);
    setMediaUri(null);
    setAssignedTo(null);
    setAssignedToName("");
  };

  const openManualModal = () => {
    if (!canAssignItems(projectRole)) {
      Alert.alert(
        "Begrænset adgang",
        "Du har ikke rettighed til at oprette sager i dette projekt."
      );
      return;
    }
    resetManualForm();
    setModalVisible(true);
  };

  const handleCreateItem = async () => {
    if (!activeProject || !user?.uid) return;
    if (!canAssignItems(projectRole)) {
      Alert.alert(
        "Begrænset adgang",
        "Du har ikke rettighed til at oprette sager i dette projekt."
      );
      return;
    }

    const finalContent = content.trim();
    const finalTitle = title.trim() || deriveTitle(finalContent);
    if (!finalContent && !finalTitle && !mediaUrl) {
      Alert.alert("Manglende indhold", "Tilføj tekst eller et foto før du gemmer.");
      return;
    }

    setCreating(true);
    try {
      const finalCategory =
        category || suggestCategory({ title: finalTitle, content: finalContent, type: itemType });
      await createItem({
        projectId: activeProject.id,
        createdBy: user.uid,
        createdByName: user.displayName || user.name || undefined,
        createdByEmail: user.email || user.storedEmail || undefined,
        type: itemType,
        title: finalTitle,
        content: finalContent,
        category: finalCategory,
        status: "new",
        mediaUrl: mediaUrl || undefined,
        assignedTo: assignedTo || undefined,
        assignedToName: assignedToName || undefined,
      });
      setModalVisible(false);
      resetManualForm();
    } catch (error) {
       
      console.log("Create item error", error);
      Alert.alert("Fejl", "Kunne ikke oprette notatet.");
    } finally {
      setCreating(false);
    }
  };

  const handlePickImage = async () => {
    if (!activeProject) return;
    setUploading(true);
    try {
      const asset = await pickImage();
      if (!asset?.uri) return;
      setMediaUri(asset.uri);
      const url = await uploadImage(
        asset,
        `projects/${activeProject.id}/items/${Date.now()}.jpg`
      );
      setMediaUrl(url);
    } catch (error) {
       
      console.log("Pick image error", error);
      Alert.alert("Fejl", "Kunne ikke vælge eller uploade billedet.");
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!activeProject) return;
    setUploading(true);
    try {
      const asset = await takePhoto();
      if (!asset?.uri) return;
      setMediaUri(asset.uri);
      const url = await uploadImage(
        asset,
        `projects/${activeProject.id}/items/${Date.now()}.jpg`
      );
      setMediaUrl(url);
    } catch (error) {
       
      console.log("Take photo error", error);
      Alert.alert("Fejl", "Kunne ikke tage eller uploade billedet.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setMediaUrl(null);
    setMediaUri(null);
  };

  const handleVoiceSave = async (voiceItem: {
    type: ItemType;
    title: string;
    content: string;
    category: string;
    mediaUrl?: string;
    assignedTo?: string;
    assignedToName?: string;
  }) => {
    if (!activeProject || !user?.uid) return;
    if (!canAssignItems(projectRole)) {
      Alert.alert(
        "Begrænset adgang",
        "Du har ikke rettighed til at oprette sager i dette projekt."
      );
      return;
    }
    try {
      await createItem({
        projectId: activeProject.id,
        createdBy: user.uid,
        createdByName: user.displayName || user.name || undefined,
        createdByEmail: user.email || user.storedEmail || undefined,
        type: voiceItem.type,
        title: voiceItem.title,
        content: voiceItem.content,
        category: voiceItem.category,
        status: "new",
        mediaUrl: voiceItem.mediaUrl,
        assignedTo: voiceItem.assignedTo,
        assignedToName: voiceItem.assignedToName,
      });
    } catch (error) {
       
      console.log("Voice save error", error);
      Alert.alert("Fejl", "Kunne ikke gemme optagelsen.");
    }
  };

  if (projectLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Board</Text>
        <ActivityIndicator
          size="large"
          color={isDark ? "#38bdf8" : "#0284c7"}
          style={{ marginTop: 40 }}
        />
      </View>
    );
  }

  if (!activeProject) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Board</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Vælg et projekt først</Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.buttonPrimaryText}>Gå til projekter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleSection}>
          <Text style={styles.header}>Board</Text>
          <Text style={styles.projectName} numberOfLines={2} ellipsizeMode="tail">
            {activeProject.name}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.addButton, styles.voiceButton]}
            onPress={() => {
              if (!canAssignItems(projectRole)) {
                Alert.alert(
                  "Begrænset adgang",
                  "Du har ikke rettighed til at oprette sager i dette projekt."
                );
                return;
              }
              setVoiceModalVisible(true);
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Optag sag med stemme"
          >
            <Text style={styles.addButtonText}>🎤 Optag</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, !canAssignItems(projectRole) && styles.buttonDisabled]}
            onPress={openManualModal}
            disabled={!canAssignItems(projectRole)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Tilføj sag manuelt"
          >
            <Text style={styles.addButtonText}>+ Tilføj</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.archiveToggleRow}>
        <TouchableOpacity
          style={[styles.archiveToggle, !showArchived && styles.archiveToggleActive]}
          onPress={() => setShowArchived(false)}
        >
          <Text
            style={[!showArchived ? styles.archiveToggleActiveText : styles.archiveToggleText]}
          >
            Aktive
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.archiveToggle, showArchived && styles.archiveToggleActive]}
          onPress={() => setShowArchived(true)}
        >
          <Text
            style={[showArchived ? styles.archiveToggleActiveText : styles.archiveToggleText]}
          >
            Arkiveret
          </Text>
        </TouchableOpacity>
      </View>

      {(filterCategory || filterStatus) ? (
        <View style={styles.filterBar}>
          <Text style={styles.filterText}>
            Filter:
            {filterCategory ? ` ${filterCategory}` : ""}
            {filterStatus ? ` (${formatStatus(filterStatus)})` : ""}
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/board")}>
            <Text style={styles.filterClear}>Nulstil</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={isDark ? "#38bdf8" : "#0284c7"}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Ingen indlæg endnu</Text>
              <Text style={styles.emptySubtitle}>
                Tryk + for at tilføje idéer, observationer, fejl eller fotos.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.itemCard, item.status === "archived" && styles.archivedCard]}
              onPress={() => router.push(`/item?itemId=${item.id}`)}
            >
              <View style={styles.itemHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: ITEM_TYPE_COLORS[item.type] },
                    item.status === "archived" && styles.archivedTypeBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      item.status === "archived" && styles.archivedTypeBadgeText,
                    ]}
                  >
                    {ITEM_TYPE_LABELS[item.type]}
                  </Text>
                </View>
                {item.mediaUrl ? (
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>📷 Foto</Text>
                  </View>
                ) : null}
                {item.category ? (
                  <Text
                    style={[styles.categoryText, item.status === "archived" && styles.archivedText]}
                  >
                    {item.category}
                  </Text>
                ) : null}
                {item.category ? (
                  <TouchableOpacity
                    onPress={async () => {
                      const url = buildBoardUrl({
                        category: item.category,
                        status: "new",
                      });
                      await copyToClipboard(url);
                      Alert.alert(
                        "Kopieret",
                        `Shortcuts-link for "${item.category}" er kopieret. Brug det i Apple Shortcuts automatisering.`
                      );
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.linkButton}>🔗</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text
                style={[styles.itemTitle, item.status === "archived" && styles.archivedText]}
              >
                {item.title}
              </Text>
              {item.content ? (
                <Text
                  style={[styles.itemContent, item.status === "archived" && styles.archivedText]}
                  numberOfLines={3}
                >
                  {item.content}
                </Text>
              ) : null}
              {item.assignedToName ? (
                <View style={styles.assigneeRow}>
                  <Text
                    style={[styles.assigneeText, item.status === "archived" && styles.archivedText]}
                  >
                    👤 {item.assignedToName}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Text
                  style={[styles.metaText, item.status === "archived" && styles.archivedText]}
                >
                  {formatDate(item.createdAt)} · {formatCreator(item)}
                  {item.status ? ` · ${formatStatus(item.status)}` : ""}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <VoiceCaptureModal
        visible={voiceModalVisible}
        projectId={activeProject?.id}
        onClose={() => setVoiceModalVisible(false)}
        onSave={handleVoiceSave}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          resetManualForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <CreateItemForm
              mode="manual"
              header="Nyt indlæg"
              itemType={itemType}
              onItemTypeChange={setItemType}
              content={content}
              onContentChange={setContent}
              title={title}
              onTitleChange={setTitle}
              category={category}
              onCategoryChange={setCategory}
              mediaUrl={mediaUrl}
              mediaUri={mediaUri || undefined}
              onPickImage={handlePickImage}
              onTakePhoto={handleTakePhoto}
              onRemoveImage={handleRemoveImage}
              assignedTo={assignedTo || ""}
              assignedToName={assignedToName}
              onAssigneeChange={(id, name) => {
                setAssignedTo(id || null);
                setAssignedToName(name);
              }}
              members={members}
              currentUser={user}
              projectRole={projectRole}
              onSave={handleCreateItem}
              onCancel={() => {
                setModalVisible(false);
                resetManualForm();
              }}
              isSaving={creating || uploading}
              defaultType="idea"
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
      gap: 12,
    },
    headerTitleSection: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    headerButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-end",
      alignItems: "flex-start",
      maxWidth: "45%",
    },
    header: {
      fontSize: 28,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    projectName: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 2,
    },
    addButton: {
      backgroundColor: "#38bdf8",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      width: 96,
      alignItems: "center",
      justifyContent: "center",
    },
    voiceButton: {
      backgroundColor: "#f87171",
    },
    addButtonText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    list: {
      paddingBottom: 24,
    },
    filterBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#334155" : "#e2e8f0",
    },
    filterText: {
      fontSize: 13,
      color: isDark ? "#e2e8f0" : "#1e293b",
      fontWeight: "600",
    },
    filterClear: {
      fontSize: 13,
      color: "#38bdf8",
      fontWeight: "600",
    },
    linkButton: {
      fontSize: 12,
      marginLeft: 4,
    },
    archiveToggleRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    archiveToggle: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
      alignItems: "center",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    archiveToggleActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    archiveToggleText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
    archiveToggleActiveText: {
      color: "#0f172a",
      fontWeight: "700",
    },
    archivedCard: {
      opacity: 0.9,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderStyle: "dashed",
      borderColor: isDark ? "#475569" : "#94a3b8",
    },
    archivedText: {
      color: isDark ? "#94a3b8" : "#64748b",
    },
    archivedTypeBadge: {
      opacity: 0.85,
    },
    archivedTypeBadgeText: {
      color: "#0f172a",
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
    typeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    typeBadgeText: {
      color: "#0f172a",
      fontSize: 10,
      fontWeight: "700",
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
    doneBadge: {
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
    mediaIndicator: {
      marginTop: 2,
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: 11,
    },
    metaRow: {
      marginTop: 4,
    },
    metaText: {
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: 10,
    },
    assigneeRow: {
      marginTop: 4,
      marginBottom: 2,
    },
    assigneeText: {
      fontSize: 12,
      color: "#38bdf8",
      fontWeight: "600",
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.6)",
      padding: 16,
    },
    modalScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 24,
    },
    buttonPrimary: {
      backgroundColor: "#38bdf8",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    buttonPrimaryText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
