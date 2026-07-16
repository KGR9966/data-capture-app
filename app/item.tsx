import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { CaptureItem, deleteItem, getItemById, ItemStatus, ItemType, updateItem } from "../services/items";
import { ProjectMember, subscribeToProjectMembers } from "../services/projects";
import { canAssignItems, canDeleteItem, canEditItem, getProjectRole, ProjectRole } from "../services/roles";

function formatDate(ts: any) {
  if (!ts) return "Ukendt tidspunkt";
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

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [item, setItem] = useState<CaptureItem | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editType, setEditType] = useState<ItemType>("other");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStatus, setEditStatus] = useState<ItemStatus>("new");
  const [editTags, setEditTags] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState<string | null>(null);
  const [editAssignedToName, setEditAssignedToName] = useState<string>("");
  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  const projectRole: ProjectRole | null = item?.projectId
    ? getProjectRole({ id: item.projectId, ownerId: "" }, user?.uid, members)
    : null;

  const assignmentOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [
      { id: "", label: "Ingen ansvarlig" },
    ];
    members.forEach((m) => {
      if (m.userId) {
        options.push({
          id: m.userId,
          label: m.displayName || m.email || m.userId,
        });
      }
    });
    return options;
  }, [members]);

  useEffect(() => {
    if (!itemId || typeof itemId !== "string") {
      return;
    }
    let unsubscribeMembers: (() => void) | undefined;
    getItemById(itemId)
      .then((data) => {
        setItem(data);
        if (data) {
          setEditType(data.type);
          setEditTitle(data.title);
          setEditContent(data.content || "");
          setEditCategory(data.category || "");
          setEditStatus(data.status);
          setEditTags(data.tags?.join(", ") || "");
          setEditAssignedTo(data.assignedTo || null);
          setEditAssignedToName(data.assignedToName || "");
          if (data.projectId) {
            unsubscribeMembers = subscribeToProjectMembers(data.projectId, (m) => setMembers(m));
          }
        }
      })
      .catch(console.log)
      .finally(() => setLoading(false));
    return () => {
      if (unsubscribeMembers) unsubscribeMembers();
    };
  }, [itemId]);

  const handleDelete = () => {
    if (!item || !user?.uid || !canDeleteItem(projectRole, item, user.uid)) {
      Alert.alert("Begrænset adgang", "Du har ikke rettighed til at slette dette indlæg.");
      return;
    }
    Alert.alert("Slet indlæg", "Er du sikker?", [
      { text: "Annuller", style: "cancel" },
      {
        text: "Slet",
        style: "destructive",
        onPress: async () => {
          if (!itemId || typeof itemId !== "string") return;
          try {
            await deleteItem(itemId);
            router.back();
          } catch (error) {
            console.log("Delete item error", error);
            Alert.alert("Fejl", "Kunne ikke slette indlægget.");
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!itemId || typeof itemId !== "string" || !item || !user?.uid) return;
    if (!canEditItem(projectRole, item, user.uid)) {
      Alert.alert("Begrænset adgang", "Du har ikke rettighed til at redigere dette indlæg.");
      return;
    }
    setSaving(true);
    try {
      const updates: Partial<CaptureItem> = {
        type: editType,
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory.trim() || undefined,
        status: editStatus,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        assignedTo: editAssignedTo || undefined,
        assignedToName: editAssignedToName || undefined,
      };
      await updateItem(itemId, updates);
      setItem({ ...item, ...updates });
      setEditing(false);
    } catch (error) {
      console.log("Update item error", error);
      Alert.alert("Fejl", "Kunne ikke gemme ændringerne.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!item) return;
    setEditType(item.type);
    setEditTitle(item.title);
    setEditContent(item.content || "");
    setEditCategory(item.category || "");
    setEditStatus(item.status);
    setEditTags(item.tags?.join(", ") || "");
    setEditAssignedTo(item.assignedTo || null);
    setEditAssignedToName(item.assignedToName || "");
    setEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDark ? "#38bdf8" : "#0284c7"} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Indlægget blev ikke fundet.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Tilbage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderView = () => (
    <>
      <View style={styles.typeBadge}>
        <Text style={styles.typeText}>{ITEM_TYPE_LABELS[item.type]}</Text>
      </View>

      <Text style={styles.title}>{item.title}</Text>

      {item.category ? (
        <Text style={styles.category}>Kategori: {item.category}</Text>
      ) : null}

      {item.mediaUrl ? (
        <View style={styles.imageCard}>
          <Image
            source={{ uri: item.mediaUrl }}
            style={styles.image}
            contentFit="cover"
          />
          <TouchableOpacity
            style={styles.removeImageInlineButton}
            onPress={() => {
              Alert.alert("Fjern foto", "Er du sikker?", [
                { text: "Annuller", style: "cancel" },
                {
                  text: "Fjern",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await updateItem(item.id, { mediaUrl: "" });
                      setItem({ ...item, mediaUrl: undefined });
                    } catch (error) {
                      console.log("Remove image error", error);
                      Alert.alert("Fejl", "Kunne ikke fjerne fotoet.");
                    }
                  },
                },
              ]);
            }}
          >
            <Text style={styles.removeImageInlineText}>Fjern foto</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {item.content ? (
        <View style={styles.contentCard}>
          <Text style={styles.content}>{item.content}</Text>
        </View>
      ) : null}

      {item.assignedToName ? (
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Ansvarlig</Text>
          <Text style={styles.metaValue}>{item.assignedToName}</Text>
        </View>
      ) : null}

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Status</Text>
        <Text style={styles.metaValue}>{item.status}</Text>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Oprettet</Text>
        <Text style={styles.metaValue}>{formatDate(item.createdAt)} af {formatCreator(item)}</Text>
      </View>

      {item.tags && item.tags.length > 0 ? (
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Tags</Text>
          <Text style={styles.metaValue}>{item.tags.join(", ")}</Text>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            user?.uid && item && !canEditItem(projectRole, item, user.uid) && styles.buttonDisabled,
          ]}
          onPress={() => {
            if (!user?.uid || !item || !canEditItem(projectRole, item, user.uid)) {
              Alert.alert("Begrænset adgang", "Du har ikke rettighed til at redigere dette indlæg.");
              return;
            }
            setEditing(true);
          }}
          disabled={user?.uid && item ? !canEditItem(projectRole, item, user.uid) : true}
        >
          <Text style={styles.buttonPrimaryText}>Rediger</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.deleteButtonSmall,
            user?.uid && item && !canDeleteItem(projectRole, item, user.uid) && styles.buttonDisabled,
          ]}
          onPress={handleDelete}
          disabled={user?.uid && item ? !canDeleteItem(projectRole, item, user.uid) : true}
        >
          <Text style={styles.deleteButtonText}>Slet</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEdit = () => (
    <>
      <Text style={styles.sectionLabel}>Type</Text>
      <View style={styles.typeRow}>
        {(
          ["other", "observation", "bug", "idea", "comment", "photo", "voice"] as ItemType[]
        ).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeChip,
              editType === type && {
                backgroundColor: ITEM_TYPE_COLORS[type],
              },
            ]}
            onPress={() => setEditType(type)}
          >
            <Text
              style={[
                styles.typeChipText,
                editType === type && { color: "#0f172a" },
              ]}
            >
              {ITEM_TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Titel</Text>
      <TextInput
        style={styles.input}
        value={editTitle}
        onChangeText={setEditTitle}
        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
      />

      <Text style={styles.sectionLabel}>Indhold</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={editContent}
        onChangeText={setEditContent}
        multiline
        numberOfLines={5}
        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
      />

      <Text style={styles.sectionLabel}>Kategori</Text>
      <TextInput
        style={styles.input}
        value={editCategory}
        onChangeText={setEditCategory}
        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
      />

      <Text style={styles.sectionLabel}>Status</Text>
      <View style={styles.typeRow}>
        {(
          ["new", "in_progress", "done", "archived"] as ItemStatus[]
        ).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.typeChip,
              editStatus === status && styles.statusChipActive,
            ]}
            onPress={() => setEditStatus(status)}
          >
            <Text
              style={[
                styles.typeChipText,
                editStatus === status && { color: "#0f172a" },
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Tags (kommasepareret)</Text>
      <TextInput
        style={styles.input}
        value={editTags}
        onChangeText={setEditTags}
        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
      />

      {canAssignItems(projectRole) && assignmentOptions.length > 1 ? (
        <>
          <Text style={styles.sectionLabel}>Ansvarlig</Text>
          <View style={styles.typeRow}>
            {assignmentOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.typeChip,
                  editAssignedTo === option.id && styles.assigneeChipActive,
                ]}
                onPress={() => {
                  setEditAssignedTo(option.id || null);
                  setEditAssignedToName(option.label);
                }}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    editAssignedTo === option.id && styles.assigneeChipActiveText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={styles.buttonSecondaryText}>Annuller</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonPrimaryText}>{saving ? "Gemmer..." : "Gem"}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Tilbage</Text>
          </TouchableOpacity>
        </View>

        {editing ? renderEdit() : renderView()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const themedStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      paddingTop: 60,
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    headerRow: {
      marginBottom: 16,
    },
    backText: {
      color: "#38bdf8",
      fontSize: 16,
      fontWeight: "600",
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
    typeBadge: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 12,
    },
    typeText: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 8,
    },
    category: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 16,
    },
    image: {
      width: "100%",
      height: 220,
      borderRadius: 12,
      backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
    },
    imageCard: {
      marginBottom: 16,
    },
    removeImageInlineButton: {
      marginTop: 10,
      alignSelf: "flex-start",
    },
    removeImageInlineText: {
      color: "#f87171",
      fontWeight: "600",
    },
    contentCard: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      marginBottom: 16,
    },
    content: {
      fontSize: 16,
      color: isDark ? "#e2e8f0" : "#0f172a",
      lineHeight: 24,
    },
    metaCard: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      marginBottom: 10,
    },
    metaLabel: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 4,
    },
    metaValue: {
      fontSize: 15,
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    buttonRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 24,
    },
    button: {
      flex: 1,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
    },
    buttonPrimary: {
      backgroundColor: "#38bdf8",
    },
    buttonPrimaryText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    buttonSecondary: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    buttonSecondaryText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    deleteButtonSmall: {
      backgroundColor: "#f87171",
    },
    deleteButton: {
      marginTop: 24,
      backgroundColor: "#f87171",
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
    },
    deleteButtonText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 16,
    },
    input: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      color: isDark ? "#e2e8f0" : "#0f172a",
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      marginBottom: 14,
    },
    textArea: {
      height: 120,
      textAlignVertical: "top",
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 6,
      marginTop: 4,
    },
    typeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
    },
    typeChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    typeChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    statusChipActive: {
      backgroundColor: "#34d399",
    },
    assigneeChipActive: {
      backgroundColor: "#38bdf8",
    },
    assigneeChipActiveText: {
      color: "#0f172a",
    },
  });
