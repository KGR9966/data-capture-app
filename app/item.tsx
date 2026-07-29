import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Comment, createComment, deleteComment, subscribeToComments } from "../services/comments";
import { CaptureItem, deleteItem, getItemById, ItemStatus, ItemType, updateItem } from "../services/items";
import { getProjectById, Project, ProjectMember, subscribeToProjectMembers } from "../services/projects";
import { copyImageToClipboard, shareImage, shareText } from "../services/share";
import { canAssignItems, canComment, canDeleteItem, canEditItem, getProjectRole, ProjectRole } from "../services/roles";
import { copyToClipboard } from "../services/deeplinks";

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

function currentTimestamp() {
  return Date.now();
}

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  idea: "Idé",
  observation: "Observation",
  bug: "Fejl",
  note: "Notat",
  photo: "Foto",
  voice: "Stemme",
  other: "Andet",
};

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  idea: "#38bdf8",
  observation: "#a78bfa",
  bug: "#f87171",
  note: "#fbbf24",
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
  const [project, setProject] = useState<Project | null>(null);
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
  const [editAssignedTo, setEditAssignedTo] = useState<string>("");
  const [editAssignedToName, setEditAssignedToName] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const lastSendTimeRef = useRef<number>(0);
  const recentCommentTimestampsRef = useRef<Record<string, number[]>>({});
  const hasInitiallyScrolledRef = useRef(false);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const isImageActionLoading = copyLoading || shareLoading;
  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const AUTO_SCROLL_THRESHOLD = 80;

  const projectRole: ProjectRole | null = project
    ? getProjectRole(project, user?.uid, members)
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
    let unsubscribeComments: (() => void) | undefined;
    getItemById(itemId)
      .then(async (data) => {
        setItem(data);
        if (data) {
          setEditType(data.type);
          setEditTitle(data.title);
          setEditContent(data.content || "");
          setEditCategory(data.category || "");
          setEditStatus(data.status);
          setEditTags(data.tags?.join(", ") || "");
          setEditAssignedTo(data.assignedTo || "");
          setEditAssignedToName(data.assignedToName || "");
          if (data.projectId) {
            try {
              const projectData = await getProjectById(data.projectId);
              setProject(projectData);
            } catch (err) {
              console.log("Load project error", err);
            }
            unsubscribeMembers = subscribeToProjectMembers(data.projectId, (m) => setMembers(m));
            unsubscribeComments = subscribeToComments(data.projectId, itemId, (c) => setComments(c));
          }
        }
      })
      .catch(console.log)
      .finally(() => setLoading(false));
    return () => {
      if (unsubscribeMembers) unsubscribeMembers();
      if (unsubscribeComments) unsubscribeComments();
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
        assignedToName: editAssignedTo ? editAssignedToName : undefined,
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
    setEditAssignedTo(item.assignedTo || "");
    setEditAssignedToName(item.assignedToName || "");
    setEditing(false);
  };

  const canDeleteCurrentComment = (comment: Comment) => {
    if (!user?.uid || !item) return false;
    if (comment.authorId === user.uid) return true;
    if (projectRole === "owner" || projectRole === "admin") return true;
    return false;
  };

  const isNearBottom = () => {
    if (contentHeight <= scrollViewHeight) return true;
    return scrollY + scrollViewHeight >= contentHeight - AUTO_SCROLL_THRESHOLD;
  };

  const scrollToBottomIfNearEnd = (animated = true) => {
    if (isNearBottom()) {
      scrollViewRef.current?.scrollToEnd({ animated });
    }
  };

  useEffect(() => {
    if (!comments.length) return;
    if (!hasInitiallyScrolledRef.current) {
      hasInitiallyScrolledRef.current = true;
      scrollViewRef.current?.scrollToEnd({ animated: false });
      return;
    }
    const nearBottom =
      contentHeight <= scrollViewHeight ||
      scrollY + scrollViewHeight >= contentHeight - AUTO_SCROLL_THRESHOLD;
    if (nearBottom) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [comments.length, contentHeight, scrollViewHeight, scrollY]);

  const handleSubmitComment = async () => {
    if (!item || !item.projectId || !user?.uid) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      Alert.alert("For lang", "Kommentaren må max være 2000 tegn.");
      return;
    }
    if (!canComment(projectRole)) {
      Alert.alert("Begrænset adgang", "Du har ikke rettighed til at skrive kommentarer.");
      return;
    }

    const now = currentTimestamp();
    const lastSend = lastSendTimeRef.current;
    if (now - lastSend < 2000) {
      Alert.alert("Langsommere", "Vent et øjeblik før du sender en ny kommentar.");
      return;
    }

    const itemId = item.id;
    const timestamps = recentCommentTimestampsRef.current[itemId] || [];
    const oneMinuteAgo = now - 60 * 1000;
    const recent = timestamps.filter((t) => t > oneMinuteAgo);
    if (recent.length >= 10) {
      Alert.alert("For mange kommentarer", "Du kan maksimalt sende 10 kommentarer i minuttet på denne sag.");
      return;
    }

    setSubmittingComment(true);
    lastSendTimeRef.current = now;
    try {
      await createComment(item.projectId, itemId, trimmed);
      recentCommentTimestampsRef.current[itemId] = [...recent, now];
      setCommentText("");
      scrollToBottomIfNearEnd(true);
    } catch (error) {
      console.log("Create comment error", error);
      const message = error instanceof Error ? error.message : "Kunne ikke sende kommentaren. Prøv igen.";
      Alert.alert("Fejl", message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (comment: Comment) => {
    if (!item || !item.projectId || !canDeleteCurrentComment(comment)) return;
    Alert.alert("Slet kommentar", "Er du sikker?", [
      { text: "Annuller", style: "cancel" },
      {
        text: "Slet",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteComment(item.projectId, item.id, comment.id);
          } catch (error) {
            console.log("Delete comment error", error);
            Alert.alert("Fejl", "Kunne ikke slette kommentaren.");
          }
        },
      },
    ]);
  };

  const formatCommentAuthor = (comment: Comment) => {
    if (comment.authorName) return comment.authorName;
    if (comment.authorEmail) return comment.authorEmail.split("@")[0];
    return "Ukendt";
  };

  const handleCopyImage = async () => {
    if (!item?.mediaUrl || isImageActionLoading) return;
    setCopyLoading(true);
    try {
      await copyImageToClipboard(item.mediaUrl);
      setCopyFeedback(true);
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopyFeedback(false);
      }, 1500);
    } catch (error) {
      console.log("Copy image error", error);
      Alert.alert("Fejl", "Kunne ikke kopiere billedet. Tjek din forbindelse.");
    } finally {
      setCopyLoading(false);
    }
  };

  const handleShareImage = async () => {
    if (!item?.mediaUrl || isImageActionLoading) return;
    setShareLoading(true);
    try {
      await shareImage(item.mediaUrl, item.title, item.content);
    } catch (error) {
      console.log("Share image error", error);
      Alert.alert("Fejl", "Kunne ikke dele billedet. Tjek din forbindelse.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleShareContent = async () => {
    if (!item?.content) return;
    try {
      await shareText(
        item.content,
        item.title,
        `Tekst fra "${item.title}" i Data Capture`
      );
    } catch (error) {
      console.log("Share content error", error);
      Alert.alert("Fejl", "Kunne ikke dele teksten. Tjek din forbindelse.");
    }
  };

  const handleCopyContent = async () => {
    if (!item?.content) return;
    try {
      await copyToClipboard(item.content);
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 1500);
    } catch (error) {
      console.log("Copy content error", error);
      Alert.alert("Fejl", "Kunne ikke kopiere teksten.");
    }
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
          <View style={styles.imageActionsRow}>
            <TouchableOpacity
              style={[
                styles.imageActionButton,
                styles.buttonSecondary,
                copyLoading && styles.buttonDisabled,
              ]}
              onPress={handleCopyImage}
              disabled={isImageActionLoading}
            >
              {copyLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#e2e8f0" : "#0f172a"}
                />
              ) : (
                <Text style={styles.imageActionButtonText}>Kopiér foto</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.imageActionButton,
                styles.buttonPrimary,
                shareLoading && styles.buttonDisabled,
              ]}
              onPress={handleShareImage}
              disabled={isImageActionLoading}
            >
              {shareLoading ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text style={styles.imageActionButtonPrimaryText}>Del foto</Text>
              )}
            </TouchableOpacity>
          </View>
          {copyFeedback ? (
            <Text style={styles.copyFeedbackText}>Billede kopieret</Text>
          ) : null}
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
          <View style={styles.textActionsRow}>
            <TouchableOpacity
              style={[styles.textActionButton, styles.buttonSecondary]}
              onPress={handleCopyContent}
            >
              <Text style={styles.textActionButtonText}>
                {textCopied ? "Kopieret!" : "Kopiér tekst"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.textActionButton, styles.buttonPrimary]}
              onPress={handleShareContent}
            >
              <Text style={styles.textActionButtonPrimaryText}>Del tekst</Text>
            </TouchableOpacity>
          </View>
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

      <View style={styles.commentsSection}>
        <Text style={styles.commentsHeader}>Kommentarer</Text>
        {comments.length === 0 ? (
          <Text style={styles.emptyComments}>Ingen kommentarer endnu. Vær den første til at skrive noget.</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{formatCommentAuthor(comment)}</Text>
                <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
              {canDeleteCurrentComment(comment) ? (
                <TouchableOpacity
                  style={styles.deleteCommentButton}
                  onPress={() => handleDeleteComment(comment)}
                  hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteCommentText}>Slet</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>
    </>
  );

  const renderEdit = () => (
    <>
      <Text style={styles.sectionLabel}>Type</Text>
      <View style={styles.typeRow}>
        {(
          ["other", "observation", "bug", "idea", "note", "photo", "voice"] as ItemType[]
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
                  setEditAssignedTo(option.id);
                  setEditAssignedToName(option.id ? option.label : "");
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

  const isInputDisabled =
    !commentText.trim() || submittingComment || commentText.trim().length > 2000;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={{ flex: 1 }}>
        {/* Fixed header — Tilbage-knap scroller ikke væk */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Tilbage</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={(_, h) => setContentHeight(h)}
          onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
          onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={150}
        >
          {editing ? renderEdit() : renderView()}
        </ScrollView>

        {!editing && canComment(projectRole) ? (
          <View style={styles.commentInputBar}>
            <TextInput
              style={styles.commentInput}
              placeholder="Skriv en kommentar..."
              placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={2000}
              editable={!submittingComment}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                isInputDisabled && styles.buttonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={isInputDisabled}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
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
    scrollContent: {
      flexGrow: 1,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    headerRow: {
      paddingTop: 60,
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
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
    imageActionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    imageActionButton: {
      flex: 1,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
    },
    imageActionButtonText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    imageActionButtonPrimaryText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    copyFeedbackText: {
      marginTop: 8,
      fontSize: 14,
      color: "#34d399",
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
    textActionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    textActionButton: {
      flex: 1,
      borderRadius: 10,
      padding: 10,
      alignItems: "center",
    },
    textActionButtonText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
      fontSize: 13,
    },
    textActionButtonPrimaryText: {
      color: "#0f172a",
      fontWeight: "600",
      fontSize: 13,
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
    commentsSection: {
      marginTop: 24,
      marginBottom: 8,
    },
    commentsHeader: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 12,
    },
    emptyComments: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      fontStyle: "italic",
    },
    commentCard: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      marginBottom: 10,
    },
    commentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    commentAuthor: {
      fontSize: 14,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    commentTime: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    commentText: {
      fontSize: 15,
      color: isDark ? "#e2e8f0" : "#0f172a",
      lineHeight: 22,
    },
    deleteCommentButton: {
      alignSelf: "flex-start",
      marginTop: 8,
    },
    deleteCommentText: {
      color: "#f87171",
      fontSize: 13,
      fontWeight: "600",
    },
    commentInputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 24,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      borderTopWidth: 1,
      borderTopColor: isDark ? "#334155" : "#e2e8f0",
    },
    commentInput: {
      flex: 1,
      maxHeight: 120,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      color: isDark ? "#e2e8f0" : "#0f172a",
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    sendButton: {
      backgroundColor: "#38bdf8",
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    sendButtonText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
  });
