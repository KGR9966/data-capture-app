import { Image } from "expo-image";
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

import VoiceCaptureModal from "../../components/VoiceCaptureModal";
import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";
import { useTheme } from "../../contexts/ThemeContext";
import { suggestCategory } from "../../services/categories";
import { CaptureItem, createItem, ItemType, subscribeToItems } from "../../services/items";
import {
  buildBoardUrl,
  copyToClipboard,
} from "../../services/deeplinks";
import {
  pickImage,
  takePhoto,
  uploadImage,
} from "../../services/media";
import { extractTextFromImage } from "../../services/ocr";
import { ProjectMember, subscribeToProjectMembers } from "../../services/projects";
import { getProjectRole, canAssignOthers, canAssignItems, ProjectRole } from "../../services/roles";
import { getLanguageLabel, SUPPORTED_LANGUAGES, translateText } from "../../services/translation";

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  idea: "Idé",
  observation: "Observation",
  bug: "Bug",
  comment: "Kommentar",
  photo: "Foto",
  voice: "Stemme",
  other: "Andet",
};

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  idea: "#38bdf8",
  observation: "#a78bfa",
  bug: "#f87171",
  comment: "#fbbf24",
  photo: "#34d399",
  voice: "#fb923c",
  other: "#94a3b8",
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
  const [recognizingText, setRecognizingText] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ocrOriginal, setOcrOriginal] = useState("");
  const [ocrTranslated, setOcrTranslated] = useState("");
  const [ocrSourceLang, setOcrSourceLang] = useState("auto");
  const [ocrTargetLang, setOcrTargetLang] = useState("da");
  const [translating, setTranslating] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [assignedToName, setAssignedToName] = useState<string>("");

  const assignmentOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [
      { id: "", label: "Ingen ansvarlig" },
    ];
    if (user?.uid) {
      options.push({
        id: user.uid,
        label: `Mig (${user.displayName || user.name || user.email || "mig"})`,
      });
    }
    members.forEach((m) => {
      if (m.userId && m.userId !== user?.uid) {
        options.push({
          id: m.userId,
          label: m.displayName || m.email || m.userId,
        });
      }
    });
    return options;
  }, [members, user]);

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  const projectRole: ProjectRole | null = activeProject
    ? getProjectRole(activeProject, user?.uid, members)
    : null;

  const canAssignOthersInProject = canAssignOthers(projectRole);

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

  const handleCreateItem = async () => {
    if (!activeProject || !user?.uid || !title.trim()) return;
    if (!canAssignItems(projectRole)) {
      Alert.alert("Begrænset adgang", "Du har ikke rettighed til at oprette sager i dette projekt.");
      return;
    }
    setCreating(true);
    try {
      const finalCategory =
        category || suggestCategory({ title, content, type: itemType });
      await createItem({
        projectId: activeProject.id,
        createdBy: user.uid,
        createdByName: user.displayName || user.name || undefined,
        createdByEmail: user.email || user.storedEmail || undefined,
        type: itemType,
        title: title.trim(),
        content: content.trim(),
        category: finalCategory,
        status: "new",
        mediaUrl: mediaUrl || undefined,
        assignedTo: assignedTo || undefined,
        assignedToName: assignedToName || undefined,
      });
      setModalVisible(false);
      setTitle("");
      setContent("");
      setCategory("");
      setMediaUrl(null);
      setMediaUri(null);
      setOcrOriginal("");
      setOcrTranslated("");
      setCopiedOriginal(false);
      setCopiedTranslated(false);
      setAssignedTo(null);
      setAssignedToName("");
      setItemType("idea");
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
    setOcrOriginal("");
    setOcrTranslated("");
    setCopiedOriginal(false);
    setCopiedTranslated(false);
  };

  const handleReadTextFromImage = async () => {
    if (!mediaUri) return;
    setRecognizingText(true);
    try {
      const text = await extractTextFromImage(mediaUri);
      if (text) {
        setContent((prev) => (prev ? `${prev}\n\n${text}` : text));
        setOcrOriginal(text);
        setOcrTranslated("");
        setCopiedOriginal(false);
        setCopiedTranslated(false);
        setCategory(
          suggestCategory({ title: title || text, content: text, type: itemType })
        );
      } else {
        Alert.alert("Ingen tekst", "Billedet indeholdt ingen genkendelig tekst.");
      }
    } catch (error) {
      console.log("OCR error", error);
      Alert.alert("Fejl", "Kunne ikke læse tekst fra billedet.");
    } finally {
      setRecognizingText(false);
    }
  };

  const handleTranslateOcr = async () => {
    if (!ocrOriginal.trim()) return;
    setTranslating(true);
    try {
      const translated = await translateText(ocrOriginal, ocrTargetLang, ocrSourceLang);
      setOcrTranslated(translated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Oversættelse fejlede";
      Alert.alert("Oversættelse", message);
    } finally {
      setTranslating(false);
    }
  };

  const handleUseTranslated = () => {
    if (ocrTranslated) {
      setContent(ocrTranslated);
    }
  };

  const handleUseOriginal = () => {
    if (ocrOriginal) {
      setContent(ocrOriginal);
    }
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
      Alert.alert("Begrænset adgang", "Du har ikke rettighed til at oprette sager i dette projekt.");
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
        <ActivityIndicator size="large" color={isDark ? "#38bdf8" : "#0284c7"} style={{ marginTop: 40 }} />
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
        <View>
          <Text style={styles.header}>Board</Text>
          <Text style={styles.projectName}>{activeProject.name}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.addButton, styles.voiceButton]}
            onPress={() => {
              if (!canAssignItems(projectRole)) {
                Alert.alert("Begrænset adgang", "Du har ikke rettighed til at oprette sager i dette projekt.");
                return;
              }
              setVoiceModalVisible(true);
            }}
          >
            <Text style={styles.addButtonText}>🎤 Optag</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.addButton,
              !canAssignItems(projectRole) && styles.buttonDisabled,
            ]}
            onPress={() => {
              if (!canAssignItems(projectRole)) {
                Alert.alert("Begrænset adgang", "Du har ikke rettighed til at oprette sager i dette projekt.");
                return;
              }
              setModalVisible(true);
            }}
            disabled={!canAssignItems(projectRole)}
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
          <Text style={[!showArchived ? styles.archiveToggleActiveText : styles.archiveToggleText]}>Aktive</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.archiveToggle, showArchived && styles.archiveToggleActive]}
          onPress={() => setShowArchived(true)}
        >
          <Text style={[showArchived ? styles.archiveToggleActiveText : styles.archiveToggleText]}>Arkiveret</Text>
        </TouchableOpacity>
      </View>

      {(filterCategory || filterStatus) ? (
        <View style={styles.filterBar}>
          <Text style={styles.filterText}>
            Filter:
            {filterCategory ? ` ${filterCategory}` : ""}
            {filterStatus ? ` (${formatStatus(filterStatus)})` : ""}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/board")}
          >
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
                Tryk + for at tilføje idéer, observationer, bugs eller fotos.
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
                  <Text style={[styles.typeBadgeText, item.status === "archived" && styles.archivedTypeBadgeText]}>
                    {ITEM_TYPE_LABELS[item.type]}
                  </Text>
                </View>
                {item.mediaUrl ? (
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>📷 Foto</Text>
                  </View>
                ) : null}
                {item.category ? (
                  <Text style={[styles.categoryText, item.status === "archived" && styles.archivedText]}>{item.category}</Text>
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
              <Text style={[styles.itemTitle, item.status === "archived" && styles.archivedText]}>{item.title}</Text>
              {item.content ? (
                <Text style={[styles.itemContent, item.status === "archived" && styles.archivedText]} numberOfLines={3}>
                  {item.content}
                </Text>
              ) : null}
              {item.assignedToName ? (
                <View style={styles.assigneeRow}>
                  <Text style={[styles.assigneeText, item.status === "archived" && styles.archivedText]}>
                    👤 {item.assignedToName}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, item.status === "archived" && styles.archivedText]}>
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
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Nyt indlæg</Text>

              <View style={styles.typeRow}>
                {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      itemType === type && {
                        backgroundColor: ITEM_TYPE_COLORS[type],
                      },
                    ]}
                    onPress={() => setItemType(type)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        itemType === type && { color: "#0f172a" },
                      ]}
                    >
                      {ITEM_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Titel"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                value={title}
                onChangeText={setTitle}
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Beskrivelse / noter"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                returnKeyType="done"
                blurOnSubmit
              />
              <TextInput
                style={styles.input}
                placeholder="Kategori (valgfrit)"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                value={category}
                onChangeText={setCategory}
              />

              {canAssignItems(projectRole) && assignmentOptions.length > 1 ? (
                <View style={styles.assigneeSection}>
                  <Text style={styles.assigneeLabel}>Ansvarlig</Text>
                  <View style={styles.assigneeChips}>
                    {assignmentOptions
                      .filter((option) => {
                        if (option.id === "") return true;
                        if (option.id === user?.uid) return true;
                        return canAssignOthersInProject;
                      })
                      .map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.assigneeChip,
                            assignedTo === option.id && styles.assigneeChipActive,
                            option.id === "" &&
                              !canAssignOthersInProject &&
                              assignedTo !== "" &&
                              styles.assigneeChipHidden,
                          ]}
                          onPress={() => {
                            if (option.id === "" && !canAssignOthersInProject) {
                              return;
                            }
                            setAssignedTo(option.id || null);
                            setAssignedToName(
                              option.id === ""
                                ? ""
                                : option.label.replace(/^Mig \(/, "").replace(/\)$/, "")
                            );
                          }}
                        >
                          <Text
                            style={[
                              styles.assigneeChipText,
                              assignedTo === option.id && styles.assigneeChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              ) : null}

              {mediaUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: mediaUrl }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <View style={styles.imagePreviewActions}>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={handleRemoveImage}
                    >
                      <Text style={styles.removeImageText}>Fjern foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.readTextButton,
                        recognizingText && styles.buttonDisabled,
                      ]}
                      onPress={handleReadTextFromImage}
                      disabled={recognizingText}
                    >
                      <Text style={styles.readTextButtonText}>
                        {recognizingText ? "Læser tekst..." : "🔍 Læs tekst"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    style={[
                      styles.imagePickerButton,
                      styles.imagePickerButtonHalf,
                      uploading && styles.buttonDisabled,
                    ]}
                    onPress={handlePickImage}
                    disabled={uploading}
                  >
                    <Text style={styles.imagePickerText}>
                      {uploading ? "Uploader..." : "📁 Album"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.imagePickerButton,
                      styles.imagePickerButtonHalf,
                      uploading && styles.buttonDisabled,
                    ]}
                    onPress={handleTakePhoto}
                    disabled={uploading}
                  >
                    <Text style={styles.imagePickerText}>
                      {uploading ? "Uploader..." : "📷 Kamera"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {ocrOriginal ? (
                <View style={styles.ocrBox}>
                  <Text style={styles.ocrLabel}>OCR-oversættelse</Text>
                  <View style={styles.ocrLangRow}>
                    <View style={styles.ocrLangColumn}>
                      <Text style={styles.ocrLangLabel}>Fra</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.ocrLangChips}
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <TouchableOpacity
                            key={`src-${lang.code}`}
                            style={[
                              styles.ocrLangChip,
                              ocrSourceLang === lang.code && styles.ocrLangChipActive,
                            ]}
                            onPress={() => setOcrSourceLang(lang.code)}
                          >
                            <Text
                              style={[
                                styles.ocrLangChipText,
                                ocrSourceLang === lang.code &&
                                  styles.ocrLangChipTextActive,
                              ]}
                            >
                              {lang.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    <View style={styles.ocrLangColumn}>
                      <Text style={styles.ocrLangLabel}>Til</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.ocrLangChips}
                      >
                        {SUPPORTED_LANGUAGES.filter((lang) => lang.code !== "auto").map(
                          (lang) => (
                            <TouchableOpacity
                              key={`tgt-${lang.code}`}
                              style={[
                                styles.ocrLangChip,
                                ocrTargetLang === lang.code && styles.ocrLangChipActive,
                              ]}
                              onPress={() => setOcrTargetLang(lang.code)}
                            >
                              <Text
                                style={[
                                  styles.ocrLangChipText,
                                  ocrTargetLang === lang.code &&
                                    styles.ocrLangChipTextActive,
                                ]}
                              >
                                {lang.label}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </ScrollView>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.ocrTranslateButton,
                      translating && styles.buttonDisabled,
                    ]}
                    onPress={handleTranslateOcr}
                    disabled={translating}
                  >
                    <Text style={styles.ocrTranslateButtonText}>
                      {translating
                        ? "Oversætter..."
                        : `Oversæt til ${getLanguageLabel(ocrTargetLang)}`}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.ocrTextHeader}>
                    <Text style={styles.ocrLangLabel}>Original OCR-tekst</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        await copyToClipboard(ocrOriginal);
                        setCopiedOriginal(true);
                        setTimeout(() => setCopiedOriginal(false), 1500);
                      }}
                      hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                    >
                      <Text style={[styles.ocrCopyLink, copiedOriginal && styles.ocrCopyLinkActive]}>
                        {copiedOriginal ? "Kopieret!" : "Kopiér"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.input, styles.textArea, styles.ocrOriginalInput]}
                    value={ocrOriginal}
                    editable={false}
                    multiline
                    numberOfLines={2}
                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  />

                  {ocrTranslated ? (
                    <>
                      <View style={styles.ocrTextHeader}>
                        <Text style={styles.ocrLangLabel}>Oversat tekst</Text>
                        <TouchableOpacity
                          onPress={async () => {
                            await copyToClipboard(ocrTranslated);
                            setCopiedTranslated(true);
                            setTimeout(() => setCopiedTranslated(false), 1500);
                          }}
                          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                        >
                          <Text style={[styles.ocrCopyLink, copiedTranslated && styles.ocrCopyLinkActive]}>
                            {copiedTranslated ? "Kopieret!" : "Kopiér"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.input, styles.textArea, styles.ocrTranslatedInput]}
                        value={ocrTranslated}
                        onChangeText={setOcrTranslated}
                        multiline
                        numberOfLines={3}
                        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                      />
                    </>
                  ) : null}

                  <View style={styles.ocrActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.ocrActionButton,
                        styles.ocrActionButtonSecondary,
                      ]}
                      onPress={handleUseOriginal}
                    >
                      <Text style={styles.ocrActionButtonSecondaryText}>
                        Brug original
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.ocrActionButton,
                        styles.ocrActionButtonPrimary,
                        !ocrTranslated && styles.buttonDisabled,
                      ]}
                      onPress={handleUseTranslated}
                      disabled={!ocrTranslated}
                    >
                      <Text style={styles.ocrActionButtonPrimaryText}>
                        Brug oversat
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => {
                    setModalVisible(false);
                    setTitle("");
                    setContent("");
                    setCategory("");
                    setMediaUrl(null);
                    setMediaUri(null);
                    setOcrOriginal("");
                    setOcrTranslated("");
                    setCopiedOriginal(false);
                    setCopiedTranslated(false);
                    setAssignedTo(null);
                    setAssignedToName("");
                    setItemType("idea");
                  }}
                >
                  <Text style={styles.buttonSecondaryText}>Annuller</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonPrimary,
                    (!title.trim() || creating) && styles.buttonDisabled,
                  ]}
                  onPress={handleCreateItem}
                  disabled={!title.trim() || creating}
                >
                  <Text style={styles.buttonPrimaryText}>
                    {creating ? "Gemmer..." : "Gem"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
    },
    headerButtons: {
      flexDirection: "row",
      gap: 8,
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
    assigneeSection: {
      marginBottom: 12,
    },
    assigneeLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 6,
    },
    assigneeChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    assigneeChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      maxWidth: 160,
    },
    assigneeChipActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    assigneeChipHidden: {
      display: "none",
    },
    assigneeChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    assigneeChipTextActive: {
      color: "#0f172a",
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
    modalContent: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 16,
      padding: 20,
    },
    modalHeader: {
      fontSize: 20,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 16,
    },
    typeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    typeChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    input: {
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      color: isDark ? "#e2e8f0" : "#0f172a",
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#cbd5e1",
      marginBottom: 12,
    },
    textArea: {
      height: 100,
      textAlignVertical: "top",
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 8,
    },
    button: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    buttonPrimary: {
      backgroundColor: "#38bdf8",
    },
    buttonPrimaryText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    buttonSecondary: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    buttonSecondaryText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    ocrBox: {
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    ocrLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: isDark ? "#e2e8f0" : "#0f172a",
      marginBottom: 10,
    },
    ocrLangRow: {
      gap: 12,
      marginBottom: 10,
    },
    ocrLangColumn: {
      marginBottom: 6,
    },
    ocrLangLabel: {
      fontSize: 11,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 4,
    },
    ocrTextHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 2,
    },
    ocrCopyLink: {
      fontSize: 12,
      color: "#38bdf8",
      fontWeight: "600",
    },
    ocrCopyLinkActive: {
      color: "#34d399",
    },
    ocrLangChips: {
      flexDirection: "row",
    },
    ocrLangChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      marginRight: 6,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    ocrLangChipActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    ocrLangChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    ocrLangChipTextActive: {
      color: "#0f172a",
    },
    ocrTranslateButton: {
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
      marginBottom: 10,
    },
    ocrTranslateButtonText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    ocrTranslatedInput: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
    },
    ocrOriginalInput: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      color: isDark ? "#94a3b8" : "#64748b",
    },
    ocrActionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    ocrActionButton: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    ocrActionButtonPrimary: {
      backgroundColor: "#38bdf8",
    },
    ocrActionButtonPrimaryText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    ocrActionButtonSecondary: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    ocrActionButtonSecondaryText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
    imagePreviewContainer: {
      marginBottom: 12,
    },
    imagePreview: {
      width: "100%",
      height: 160,
      borderRadius: 10,
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
    },
    imagePreviewActions: {
      flexDirection: "row",
      gap: 16,
      marginTop: 8,
    },
    removeImageButton: {
      alignSelf: "flex-start",
    },
    removeImageText: {
      color: "#f87171",
      fontWeight: "600",
    },
    readTextButton: {
      alignSelf: "flex-start",
    },
    readTextButtonText: {
      color: "#38bdf8",
      fontWeight: "600",
    },
    imagePickerButton: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
      marginBottom: 12,
    },
    imagePickerButtonHalf: {
      flex: 1,
    },
    imageButtonRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    imagePickerText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
  });
