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
import { processVoiceCommands } from "../services/voiceCommands";
import CreateItemForm, { deriveTitle } from "./CreateItemForm";

const VOICE_COMMANDS: Record<string, { itemType: ItemType; category: string }> = {
  idé: { itemType: "idea", category: "Idé" },
  ide: { itemType: "idea", category: "Idé" },
  idea: { itemType: "idea", category: "Idé" },
  bug: { itemType: "bug", category: "Fejl" },
  fejl: { itemType: "bug", category: "Fejl" },
  observation: { itemType: "observation", category: "Observation" },
  observer: { itemType: "observation", category: "Observation" },
  observeret: { itemType: "observation", category: "Observation" },
  notat: { itemType: "note", category: "Notat" },
  bemærkning: { itemType: "note", category: "Notat" },
  kommentar: { itemType: "note", category: "Notat" },
  spørgsmål: { itemType: "note", category: "Spørgsmål" },
};

function normalizeCategoryName(name: string): string {
  return name.trim().replace(/^./, (c) => c.toUpperCase());
}

function parseVoiceCommand(text: string) {
  const trimmed = text.trim();
  const separator = "(?:\\s*[.,]?\\s+|\\s*[.,]\\s*|\\s+$|\\b(?=\\s))";

  const knownMatch = trimmed.match(
    new RegExp(
      `^\\s*(idé|ide|idea|bug|fejl|observation|observer|observeret|notat|bemærkning|kommentar|spørgsmål)${separator}`,
      "i"
    )
  );

  if (knownMatch) {
    const command = knownMatch[1].toLowerCase();
    const mapping = VOICE_COMMANDS[command];
    if (mapping) {
      return {
        cleanedText: trimmed.slice(knownMatch[0].length).trim(),
        itemType: mapping.itemType,
        category: mapping.category,
      };
    }
  }

  const customMatch = trimmed.match(
    new RegExp(
      `^\\s*([a-zæøåéA-ZÆØÅÉ0-9][a-zæøåéA-ZÆØÅÉ0-9 ]{0,24})${separator}`,
      "i"
    )
  );
  if (customMatch && customMatch[1].trim().length >= 2) {
    const category = normalizeCategoryName(customMatch[1]);
    return {
      cleanedText: trimmed.slice(customMatch[0].length).trim(),
      itemType: "other" as ItemType,
      category,
    };
  }

  return { cleanedText: trimmed, itemType: null as ItemType | null, category: "" };
}

function removeLastSentenceOrWord(text: string): string {
  const trimmed = text.trim();
  // Remove the last sentence if it ends with sentence punctuation.
  const sentenceMatch = trimmed.match(/^(.*)([.!?;:])\s*[^.!?;:]*$/s);
  if (sentenceMatch) {
    const prefix = sentenceMatch[1].trim();
    return prefix ? `${prefix}${sentenceMatch[2]}` : "";
  }
  // Fallback: remove last word.
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return "";
  return trimmed.slice(0, lastSpace).trim();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [project, setProject] = useState<Project | null>(null);

  const intentionalStopRef = useRef(false);
  const savePendingRef = useRef(false);
  const stopPendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveHandlerRef = useRef<(closeAfterSave: boolean) => Promise<void>>(
    async () => {}
  );
  const contentRef = useRef(content);
  const autoSaveOnSilenceRef = useRef(autoSaveOnSilence);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    autoSaveOnSilenceRef.current = autoSaveOnSilence;
  }, [autoSaveOnSilence]);

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
    savePendingRef.current = false;
    stopPendingRef.current = false;
    intentionalStopRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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

      const commands = processVoiceCommands(text);

      if (commands.shouldCancel) {
        stopRecording();
        onClose();
        return;
      }

      if (commands.shouldClear) {
        const currentContent = contentRef.current.trim();
        if (currentContent) {
          setClearedOriginalText(currentContent);
        }
        resetTranscript();
        setContent("");
        return;
      }

      if (commands.shouldUndo) {
        const currentContent = contentRef.current.trim();
        if (currentContent) {
          const nextContent = removeLastSentenceOrWord(currentContent);
          setContent(nextContent);
        }
        return;
      }

      const parsed = parseVoiceCommand(commands.text);
      setContent(parsed.cleanedText);

      if (commands.shouldStop && !stopPendingRef.current) {
        stopPendingRef.current = true;
        intentionalStopRef.current = true;
        savePendingRef.current = true;
        stopRecording();
        return;
      }

      if (isFinal) {
        stopPendingRef.current = false;
        if (parsed.itemType) {
          setItemType(parsed.itemType);
          setTypeLockedByVoice(true);
        }
        if (parsed.category) {
          setCategory(parsed.category);
        }
      }
    },
    onEnd: (reason) => {
      if (reason === "silence" && autoSaveOnSilenceRef.current) {
        saveHandlerRef.current(false);
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
            { text: "Gem", onPress: () => {
              intentionalStopRef.current = false;
              savePendingRef.current = false;
              handleSaveInternal(true);
            }},
            { text: "Luk", style: "cancel" },
          ]
        );
      }
    },
    onError: (message) => {
       
      console.log("Voice error", message);
    },
  });

  const handleSaveInternal = async (closeAfterSave: boolean) => {
    const finalContent = content.trim() || transcript.trim();
    const finalTitle = title.trim() || deriveTitle(finalContent);
    if (!finalContent && !finalTitle && !mediaUrl) {
      if (closeAfterSave) {
        onClose();
      } else {
        resetForm();
        resetTranscript();
      }
      return;
    }

    setIsProcessing(true);
    try {
      await onSave({
        type: itemType,
        title: finalTitle,
        content: finalContent,
        category,
        mediaUrl: mediaUrl || undefined,
        assignedTo: assignedTo || undefined,
        assignedToName: assignedTo ? assignedToName : undefined,
      });
      if (closeAfterSave) {
        onClose();
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
  };

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
    handleSaveInternal(true);
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
        <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
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
            helpText="Sig punktum, komma, ny linje, skift, slet sidste ord, fortryd, slet alt eller gem."
            topSlot={recordControls}
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
          />
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
      color: "#f87171",
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
  });
