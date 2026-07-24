import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { copyToClipboard } from "../services/deeplinks";
import type { ItemType } from "../services/items";
import {
  pickImage,
  takePhoto,
  uploadImage,
} from "../services/media";
import {
  getProjectById,
  Project,
  ProjectMember,
  subscribeToProjectMembers,
} from "../services/projects";
import { getProjectRole, ProjectRole } from "../services/roles";
import { shareText } from "../services/share";
import {
  parseVoiceInput,
  removeLastWord,
  type VoiceParseResult,
} from "../services/voiceCommands";
import CreateItemForm from "./CreateItemForm";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getTimerColor(seconds: number, isDark: boolean): string {
  if (seconds >= 60) return "#ef4444"; // rød ved 60+ sek / OS-timeout
  if (seconds >= 45) return "#f97316"; // orange advarsel
  return isDark ? "#e2e8f0" : "#0f172a"; // neutral
}

interface VoiceCaptureModalProps {
  visible: boolean;
  projectId?: string;
  onClose: () => void;
  onSave: (item: {
    type: ItemType;
    title: string;
    content: string;
    category: string;
    mediaUrl?: string;
    assignedTo?: string;
    assignedToName?: string;
  }) => void;
}

export default function VoiceCaptureModal({
  visible,
  projectId,
  onClose,
  onSave,
}: VoiceCaptureModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  const [itemType, setItemType] = useState<ItemType>("other");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [assignedToName, setAssignedToName] = useState<string>("");
  const [autoSaveOnSilence, setAutoSaveOnSilence] = useState(true);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [clearedOriginalText, setClearedOriginalText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [typeLockedByVoice, setTypeLockedByVoice] = useState(false);
  const [saveFeedbackVisible, setSaveFeedbackVisible] = useState(false);

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [project, setProject] = useState<Project | null>(null);

  const intentionalStopRef = useRef(false);
  const savePendingRef = useRef(false);
  const stopPendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveHandlerRef = useRef<(closeAfterSave: boolean) => Promise<void>>(
    async () => {}
  );
  const onCloseRef = useRef(onClose);
  const onSaveRef = useRef(onSave);

  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const categoryRef = useRef(category);
  const itemTypeRef = useRef(itemType);
  const autoSaveOnSilenceRef = useRef(autoSaveOnSilence);
  const typeLockedByVoiceRef = useRef(typeLockedByVoice);
  const manualTitleEditRef = useRef(false);
  const manualCategoryEditRef = useRef(false);
  const manualTypeEditRef = useRef(false);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  useEffect(() => {
    itemTypeRef.current = itemType;
  }, [itemType]);

  useEffect(() => {
    autoSaveOnSilenceRef.current = autoSaveOnSilence;
  }, [autoSaveOnSilence]);

  useEffect(() => {
    typeLockedByVoiceRef.current = typeLockedByVoice;
  }, [typeLockedByVoice]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const resetForm = useCallback(() => {
    setItemType("other");
    setTitle("");
    setContent("");
    setCategory("");
    setMediaUrl(null);
    setMediaUri(null);
    setAssignedTo("");
    setAssignedToName("");
    setClearedOriginalText("");
    setRecordingDuration(0);
    setTypeLockedByVoice(false);
    setSaveFeedbackVisible(false);
    savePendingRef.current = false;
    stopPendingRef.current = false;
    intentionalStopRef.current = false;
    manualTitleEditRef.current = false;
    manualCategoryEditRef.current = false;
    manualTypeEditRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const playSavedFeedback = useCallback(() => {
    try {
      Vibration.vibrate(50);
      setTimeout(() => {
        try {
          Vibration.vibrate(50);
        } catch {
          // ignore
        }
      }, 150);
    } catch {
      // ignore
    }
  }, []);

  const showSaveFeedbackAndClose = useCallback(() => {
    playSavedFeedback();
    setSaveFeedbackVisible(true);
    setTimeout(() => {
      setSaveFeedbackVisible(false);
      onCloseRef.current();
    }, 1200);
  }, [playSavedFeedback]);

  const applyParsedResult = useCallback(
    (parsed: VoiceParseResult, { lockType = false }: { lockType?: boolean } = {}) => {
      if (!manualTitleEditRef.current) {
        setTitle(parsed.title);
      }
      setContent(parsed.content);
      if (!manualCategoryEditRef.current) {
        setCategory(parsed.category);
      }
      if (!manualTypeEditRef.current) {
        setItemType(parsed.type);
      }
      if (lockType && parsed.type !== "other" && !manualTypeEditRef.current) {
        setTypeLockedByVoice(true);
      }
    },
    []
  );

  const {
    transcript,
    isRecording,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useVoiceRecognition({
    locale: "da-DK",
    autoStopMs: autoSaveOnSilence ? 5000 : 60 * 60 * 1000,
    onResult: (text, isFinal) => {
      if (stopPendingRef.current) return;

      const parsed = parseVoiceInput(text);

      if (parsed.command === "cancel") {
        stopRecording();
        onCloseRef.current();
        return;
      }

      if (parsed.command === "clear") {
        const hadText = contentRef.current.trim() || titleRef.current.trim();
        if (hadText) {
          setClearedOriginalText(
            [titleRef.current, contentRef.current].filter(Boolean).join("\n")
          );
        }
        resetTranscript();
        if (!manualTitleEditRef.current) {
          setTitle("");
        }
        setContent("");
        if (!manualCategoryEditRef.current) {
          setCategory("Andet");
        }
        if (!manualTypeEditRef.current) {
          setItemType("other");
        }
        return;
      }

      if (parsed.command === "undo") {
        const currentContent = contentRef.current.trim();
        if (currentContent) {
          const lines = currentContent.split("\n");
          lines.pop();
          setContent(lines.join("\n"));
        } else {
          const currentTitle = titleRef.current.trim();
          if (currentTitle) {
            setTitle(removeLastWord(currentTitle));
          }
        }
        resetTranscript();
        return;
      }

      if (parsed.command === "save") {
        applyParsedResult(parsed, { lockType: true });
        stopPendingRef.current = true;
        intentionalStopRef.current = true;
        savePendingRef.current = true;
        stopRecording();
        return;
      }

      // Almindelig opdatering under optagelse.
      applyParsedResult(parsed, { lockType: isFinal });
    },
    onEnd: (reason) => {
      if (reason === "silence" && autoSaveOnSilenceRef.current) {
        saveHandlerRef.current(true);
        return;
      }
      if (savePendingRef.current) {
        savePendingRef.current = false;
        saveHandlerRef.current(true);
        return;
      }
      if (reason === "error") {
        Alert.alert(
          "Optagelse afbrudt",
          "Optagelsen stoppede uventet. Du kan gemme det nuværende indhold, starte en ny optagelse eller lukke.",
          [
            { text: "Start ny optagelse", onPress: () => startRecording() },
            {
              text: "Gem",
              onPress: () => {
                intentionalStopRef.current = false;
                savePendingRef.current = false;
                saveHandlerRef.current(true);
              },
            },
            { text: "Luk", style: "cancel" },
          ]
        );
      }
    },
    onError: (message) => {
      console.log("Voice error", message);
    },
  });

  const handleSaveInternal = useCallback(
    async (closeAfterSave: boolean) => {
      const finalContent = contentRef.current.trim() || transcript.trim();
      const finalTitle = titleRef.current.trim();
      if (!finalContent && !finalTitle && !mediaUrl) {
        if (closeAfterSave) {
          onCloseRef.current();
        } else {
          resetForm();
          resetTranscript();
        }
        return;
      }

      setIsProcessing(true);
      try {
        await onSaveRef.current({
          type: itemTypeRef.current,
          title: finalTitle,
          content: finalContent,
          category: categoryRef.current,
          mediaUrl: mediaUrl || undefined,
          assignedTo: assignedTo || undefined,
          assignedToName: assignedTo ? assignedToName : undefined,
        });
        if (closeAfterSave) {
          showSaveFeedbackAndClose();
        } else {
          resetForm();
          resetTranscript();
        }
      } catch (error) {
        console.log("Voice save error", error);
        Alert.alert("Fejl", "Kunne ikke gemme optagelsen.");
      } finally {
        setIsProcessing(false);
        savePendingRef.current = false;
      }
    },
    [mediaUrl, assignedTo, assignedToName, resetForm, resetTranscript, showSaveFeedbackAndClose, transcript]
  );

  useEffect(() => {
    saveHandlerRef.current = handleSaveInternal;
  }, [handleSaveInternal]);

  useEffect(() => {
    if (visible) {
      const timeout = setTimeout(() => {
        resetForm();
        resetTranscript();
      }, 0);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [visible, resetForm, resetTranscript]);

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    getProjectById(projectId)
      .then((p) => {
        if (mounted) setProject(p);
      })
      .catch((err) => console.log("Load project error", err));
    const unsubscribe = subscribeToProjectMembers(projectId, (data) => setMembers(data));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    if (!isRecording) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const projectRole: ProjectRole | null = project
    ? getProjectRole(project, user?.uid, members)
    : null;

  const handleToggleRecording = () => {
    if (isRecording) {
      intentionalStopRef.current = true;
      stopRecording();
    } else {
      intentionalStopRef.current = false;
      savePendingRef.current = false;
      stopPendingRef.current = false;
      setClearedOriginalText("");
      resetTranscript();
      setRecordingDuration(0);
      startRecording();
    }
  };

  const handleTakePhoto = async () => {
    if (!projectId) return;
    try {
      const asset = await takePhoto();
      if (!asset?.uri) return;
      setMediaUri(asset.uri);
      const url = await uploadImage(asset, `projects/${projectId}/items/${Date.now()}.jpg`);
      setMediaUrl(url);
    } catch (error) {
      console.log("Voice modal take photo error", error);
      Alert.alert("Fejl", "Kunne ikke tage eller uploade billedet.");
    }
  };

  const handlePickImage = async () => {
    if (!projectId) return;
    try {
      const asset = await pickImage();
      if (!asset?.uri) return;
      setMediaUri(asset.uri);
      const url = await uploadImage(asset, `projects/${projectId}/items/${Date.now()}.jpg`);
      setMediaUrl(url);
    } catch (error) {
      console.log("Voice modal pick image error", error);
      Alert.alert("Fejl", "Kunne ikke vælge eller uploade billedet.");
    }
  };

  const handleRemoveImage = () => {
    setMediaUrl(null);
    setMediaUri(null);
  };

  const handleCopyCleared = async () => {
    await copyToClipboard(clearedOriginalText);
  };

  const handleShareCleared = async () => {
    try {
      await shareText(clearedOriginalText, "Fjernet tekst", "Fjernet tekst fra Data Capture");
    } catch (error) {
      console.log("Share cleared text error", error);
    }
  };

  const handleSave = () => {
    intentionalStopRef.current = false;
    savePendingRef.current = false;
    saveHandlerRef.current(true);
  };

  const handleTitleChange = (text: string) => {
    if (text !== titleRef.current) {
      manualTitleEditRef.current = true;
    }
    setTitle(text);
  };

  const handleCategoryChange = (text: string) => {
    if (text !== categoryRef.current) {
      manualCategoryEditRef.current = true;
    }
    setCategory(text);
  };

  const handleItemTypeChange = (type: ItemType) => {
    if (type !== itemTypeRef.current) {
      manualTypeEditRef.current = true;
      setTypeLockedByVoice(false);
    }
    setItemType(type);
  };

  const recordControls = (
    <View style={styles.recordSection}>
      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        onPress={handleToggleRecording}
      >
        <Text style={styles.recordButtonText}>
          {isRecording ? "⏹ Stop optagelse" : "🎙 Start optagelse"}
        </Text>
      </TouchableOpacity>

      {isRecording ? (
        <Text
          style={[
            styles.timerText,
            { color: getTimerColor(recordingDuration, isDark) },
          ]}
        >
          {formatDuration(recordingDuration)}
        </Text>
      ) : null}

      <View style={styles.autoSaveRow}>
        <Text style={styles.autoSaveLabel}>Auto-gem efter stilhed</Text>
        <Switch
          value={autoSaveOnSilence}
          onValueChange={setAutoSaveOnSilence}
          trackColor={{ false: isDark ? "#475569" : "#cbd5e1", true: "#38bdf8" }}
          thumbColor={autoSaveOnSilence ? "#0f172a" : isDark ? "#94a3b8" : "#f1f5f9"}
        />
      </View>

      {clearedOriginalText ? (
        <View style={styles.clearedBox}>
          <View style={styles.clearedHeader}>
            <Text style={styles.clearedLabel}>Fjernet originaltekst</Text>
            <View style={styles.clearedActions}>
              <TouchableOpacity onPress={handleCopyCleared} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
                <Text style={styles.clearedActionText}>Kopiér</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShareCleared} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
                <Text style={styles.clearedActionText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <CreateItemForm
            mode="voice"
            header="Optag"
            helpText="Sig punktum, komma, ny linje, nyt afsnit, fortryd, slet alt eller gem."
            topSlot={recordControls}
            itemType={itemType}
            onItemTypeChange={handleItemTypeChange}
            content={content}
            onContentChange={setContent}
            title={title}
            onTitleChange={handleTitleChange}
            category={category}
            onCategoryChange={handleCategoryChange}
            mediaUrl={mediaUrl}
            mediaUri={mediaUri || undefined}
            onPickImage={handlePickImage}
            onTakePhoto={handleTakePhoto}
            onRemoveImage={handleRemoveImage}
            assignedTo={assignedTo}
            assignedToName={assignedToName}
            onAssigneeChange={(id, name) => {
              setAssignedTo(id);
              setAssignedToName(name);
            }}
            members={members}
            currentUser={user}
            projectRole={projectRole}
            onSave={handleSave}
            onCancel={onClose}
            isSaving={isProcessing}
            defaultType="other"
            typeLocked={typeLockedByVoice}
            autoSuggestCategory={false}
            autoSuggestType={false}
          />

          {saveFeedbackVisible ? (
            <View style={styles.toastOverlay}>
              <View style={styles.toastBox}>
                <Text style={styles.toastText}>Sagen er gemt</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const themedStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.7)",
      padding: 16,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 24,
    },
    recordSection: {
      marginBottom: 4,
    },
    recordButton: {
      backgroundColor: "#f87171",
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginBottom: 8,
    },
    recordButtonActive: {
      backgroundColor: "#991b1b",
    },
    recordButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },
    timerText: {
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 8,
    },
    autoSaveRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    autoSaveLabel: {
      fontSize: 14,
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
    clearedBox: {
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    clearedHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    clearedLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94a3b8" : "#64748b",
    },
    clearedActions: {
      flexDirection: "row",
      gap: 12,
    },
    clearedActionText: {
      fontSize: 12,
      color: "#38bdf8",
      fontWeight: "600",
    },
    toastOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      pointerEvents: "none",
    },
    toastBox: {
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    toastText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },
  });
