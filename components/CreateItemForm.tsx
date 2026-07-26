import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Image } from "expo-image";
import type { AuthUser } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { suggestCategory } from "../services/categories";
import { copyToClipboard } from "../services/deeplinks";
import type { ItemType } from "../services/items";
import type { ProjectMember } from "../services/projects";
import { canAssignItems, canAssignOthers, type ProjectRole } from "../services/roles";
import { shareText } from "../services/share";
import { getLanguageLabel, SUPPORTED_LANGUAGES, translateText } from "../services/translation";
import { extractTextFromImage } from "../services/ocr";

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  idea: "Idé",
  observation: "Observation",
  bug: "Fejl",
  note: "Notat",
  photo: "Foto",
  voice: "Stemme",
  other: "Andet",
};

export const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  idea: "#38bdf8",
  observation: "#a78bfa",
  bug: "#f87171",
  note: "#fbbf24",
  photo: "#34d399",
  voice: "#fb923c",
  other: "#94a3b8",
};

const ITEM_TYPES: ItemType[] = [
  "idea",
  "observation",
  "bug",
  "note",
  "photo",
  "voice",
  "other",
];

export interface AssignmentOption {
  id: string;
  label: string;
}

export interface CreateItemFormProps {
  mode: "voice" | "manual";
  header?: string;
  helpText?: string;
  topSlot?: React.ReactNode;
  itemType: ItemType;
  onItemTypeChange: (type: ItemType) => void;
  content: string;
  onContentChange: (text: string) => void;
  title: string;
  onTitleChange: (text: string) => void;
  category: string;
  onCategoryChange: (text: string) => void;
  mediaUrl: string | null;
  mediaUri?: string | null;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onRemoveImage: () => void;
  assignedTo: string;
  assignedToName: string;
  onAssigneeChange: (id: string, name: string) => void;
  members?: ProjectMember[];
  currentUser?: AuthUser | null;
  projectRole: ProjectRole | null;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  defaultType?: ItemType;
  autoSuggestCategory?: boolean;
  autoSuggestType?: boolean;
  typeLocked?: boolean;
}

export function deriveTitle(content: string): string {
  const firstLine = content.split("\n")[0]?.trim() || "";
  if (!firstLine) return "";
  const words = firstLine.split(/\s+/).filter(Boolean);
  return words.slice(0, 6).join(" ");
}

export default function CreateItemForm({
  mode,
  header,
  helpText,
  topSlot,
  itemType,
  onItemTypeChange,
  content,
  onContentChange,
  title,
  onTitleChange,
  category,
  onCategoryChange,
  mediaUrl,
  mediaUri,
  onPickImage,
  onTakePhoto,
  onRemoveImage,
  assignedTo,
  assignedToName,
  onAssigneeChange,
  members,
  currentUser,
  projectRole,
  onSave,
  onCancel,
  isSaving,
  defaultType = "other",
  autoSuggestCategory = true,
  autoSuggestType = true,
  typeLocked: externalTypeLocked,
}: CreateItemFormProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  const [ocrOriginal, setOcrOriginal] = useState("");
  const [ocrTranslated, setOcrTranslated] = useState("");
  const [ocrSourceLang, setOcrSourceLang] = useState("auto");
  const [ocrTargetLang, setOcrTargetLang] = useState("da");
  const [translating, setTranslating] = useState(false);
  const [recognizingText, setRecognizingText] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);

  // Track when the user has explicitly locked the type. Voice commands always
  // lock. A manual chip press only locks if it happens while a photo is already
  // attached; before a photo it is treated as a pre-selection.
  const userLockedTypeRef = useRef(externalTypeLocked || false);
  const hasPhotoRef = useRef(!!mediaUrl);

  useEffect(() => {
    userLockedTypeRef.current = externalTypeLocked || false;
  }, [externalTypeLocked]);

  useEffect(() => {
    hasPhotoRef.current = !!mediaUrl;
  }, [mediaUrl]);

  // Auto-derive title from content when title is empty (kun manuel oprettelse).
  useEffect(() => {
    if (mode === "voice") return;
    if (title.trim()) return;
    const suggestion = deriveTitle(content);
    if (suggestion && suggestion !== title) {
      onTitleChange(suggestion);
    }
  }, [content, mode, title, onTitleChange]);

  // Auto-suggest category when empty and there is text/type to base it on.
  useEffect(() => {
    if (!autoSuggestCategory) return;
    if (category.trim()) return;
    const text = `${title} ${content}`.trim();
    if (!text && itemType === "other") return;
    const suggestion = suggestCategory({ title, content, type: itemType });
    if (suggestion && suggestion !== category) {
      onCategoryChange(suggestion);
    }
  }, [autoSuggestCategory, category, content, itemType, onCategoryChange, title]);

  // AI type suggestion: infer type from text unless the user has locked the type.
  useEffect(() => {
    if (!autoSuggestType) return;
    if (itemType !== "other") return;
    if (userLockedTypeRef.current) return;
    const text = `${title} ${content}`.trim().toLowerCase();
    if (!text) return;

    let suggestedType: ItemType | null = null;
    if (/\b(bug|fejl|crash|fejler|virker ikke)\b/.test(text)) {
      suggestedType = "bug";
    } else if (/\b(id[eé]|forbedring|ønske|feature|forslag)\b/.test(text)) {
      suggestedType = "idea";
    } else if (/\b(observation|observer|bemærk|fundet)\b/.test(text)) {
      suggestedType = "observation";
    } else if (/\b(spørgsmål|hvordan|hvorfor|hvad med)\b/.test(text)) {
      suggestedType = "note";
    }

    if (suggestedType) {
      onItemTypeChange(suggestedType);
    }
  }, [autoSuggestType, content, itemType, onItemTypeChange, title]);

  // Auto-set type to photo when media is attached (unless user has locked it).
  // I voice-mode styrer stemmeparseren typen; foto skal ikke override.
  useEffect(() => {
    if (mode === "voice") return;
    if (mediaUrl && itemType !== "photo" && !userLockedTypeRef.current) {
      onItemTypeChange("photo");
    }
  }, [mediaUrl, itemType, onItemTypeChange, mode]);

  // Revert to default type if photo is removed and type was auto-set.
  useEffect(() => {
    if (mode === "voice") return;
    if (!mediaUrl && itemType === "photo" && !userLockedTypeRef.current) {
      onItemTypeChange(defaultType);
    }
  }, [defaultType, itemType, mediaUrl, onItemTypeChange, mode]);

  const assignmentOptions = useMemo<AssignmentOption[]>(() => {
    const options: AssignmentOption[] = [{ id: "", label: "Ingen ansvarlig" }];
    if (currentUser?.uid) {
      const selfLabel = `Mig (${currentUser.displayName || currentUser.email || "mig"})`;
      options.push({ id: currentUser.uid, label: selfLabel });
    }
    members?.forEach((m) => {
      if (m.userId && m.userId !== currentUser?.uid) {
        options.push({
          id: m.userId,
          label: m.displayName || m.email || m.userId,
        });
      }
    });
    return options;
  }, [currentUser, members]);

  const showAssignee = canAssignItems(projectRole) && assignmentOptions.length > 1;

  const handleSelectType = (type: ItemType) => {
    // A manual type choice locks the type only if the user makes it while a
    // photo is already attached. Before a photo it is a pre-selection that the
    // photo auto-switch can still override.
    if (hasPhotoRef.current) {
      userLockedTypeRef.current = true;
    }
    onItemTypeChange(type);
  };

  const handleReadTextFromImage = async () => {
    if (!mediaUri) return;
    setRecognizingText(true);
    try {
      const text = await extractTextFromImage(mediaUri);
      if (text) {
        const nextContent = content ? `${content}\n\n${text}` : text;
        onContentChange(nextContent);
        setOcrOriginal(text);
        setOcrTranslated("");
        setCopiedOriginal(false);
        setCopiedTranslated(false);
        if (!category.trim()) {
          onCategoryChange(suggestCategory({ title: title || text, content: text, type: itemType }));
        }
      } else {
         
        console.log("[CreateItemForm] No text found in image");
      }
    } catch (error) {
       
      console.log("[CreateItemForm] OCR error", error);
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
       
      console.log("[CreateItemForm] Translate error", error);
    } finally {
      setTranslating(false);
    }
  };

  const handleUseOriginal = () => {
    if (ocrOriginal) {
      onContentChange(ocrOriginal);
    }
  };

  const handleUseTranslated = () => {
    if (ocrTranslated) {
      onContentChange(ocrTranslated);
    }
  };

  const handleCopy = async (text: string, setCopied: (value: boolean) => void) => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async (text: string, dialogTitle: string) => {
    try {
      await shareText(text, dialogTitle, `${dialogTitle} fra Data Capture`);
    } catch (error) {
       
      console.log("[CreateItemForm] Share error", error);
    }
  };

  const handleRemoveImageInternal = () => {
    onRemoveImage();
    setOcrOriginal("");
    setOcrTranslated("");
    setCopiedOriginal(false);
    setCopiedTranslated(false);
  };

  const canSave = !!(content.trim() || title.trim() || mediaUrl);

  return (
    <View style={styles.form}>
      {header ? <Text style={styles.header}>{header}</Text> : null}
      {helpText ? <Text style={styles.helpText}>{helpText}</Text> : null}
      {topSlot ? <View style={styles.topSlot}>{topSlot}</View> : null}

      <View style={styles.typeRow}>
        {ITEM_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeChip,
              itemType === type && { backgroundColor: ITEM_TYPE_COLORS[type] },
            ]}
            onPress={() => handleSelectType(type)}
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

      {mode === "manual" ? (
        <Text style={styles.aiSuggestionHint}>Typen er et AI-forslag, indtil du trykker på en chip</Text>
      ) : null}

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={
          mode === "voice" ? "Din tekst vises her..." : "Beskrivelse / noter"
        }
        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
        value={content}
        onChangeText={onContentChange}
        multiline
        numberOfLines={5}
      />

      <TextInput
        style={styles.input}
        placeholder="Titel (valgfrit)"
        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
        value={title}
        onChangeText={onTitleChange}
      />

      <TextInput
        style={styles.input}
        placeholder="Kategori"
        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
        value={category}
        onChangeText={onCategoryChange}
      />

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
              onPress={handleRemoveImageInternal}
            >
              <Text style={styles.removeImageText}>Fjern foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.readTextButton, recognizingText && styles.buttonDisabled]}
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
            style={[styles.imagePickerButton, styles.imagePickerButtonHalf]}
            onPress={onPickImage}
          >
            <Text style={styles.imagePickerText}>📁 Album</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.imagePickerButton, styles.imagePickerButtonHalf]}
            onPress={onTakePhoto}
          >
            <Text style={styles.imagePickerText}>📷 Kamera</Text>
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
                        ocrSourceLang === lang.code && styles.ocrLangChipTextActive,
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
                          ocrTargetLang === lang.code && styles.ocrLangChipTextActive,
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
            style={[styles.ocrTranslateButton, translating && styles.buttonDisabled]}
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
            <View style={styles.ocrActionLinks}>
              <TouchableOpacity
                onPress={() => handleCopy(ocrOriginal, setCopiedOriginal)}
                hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
              >
                <Text
                  style={[styles.ocrCopyLink, copiedOriginal && styles.ocrCopyLinkActive]}
                >
                  {copiedOriginal ? "Kopieret!" : "Kopiér"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleShare(ocrOriginal, "OCR-tekst")}
                hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
              >
                <Text style={styles.ocrCopyLink}>Del</Text>
              </TouchableOpacity>
            </View>
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
                <View style={styles.ocrActionLinks}>
                  <TouchableOpacity
                    onPress={() => handleCopy(ocrTranslated, setCopiedTranslated)}
                    hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                  >
                    <Text
                      style={[
                        styles.ocrCopyLink,
                        copiedTranslated && styles.ocrCopyLinkActive,
                      ]}
                    >
                      {copiedTranslated ? "Kopieret!" : "Kopiér"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShare(ocrTranslated, "Oversat tekst")}
                    hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                  >
                    <Text style={styles.ocrCopyLink}>Del</Text>
                  </TouchableOpacity>
                </View>
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
              style={[styles.ocrActionButton, styles.ocrActionButtonSecondary]}
              onPress={handleUseOriginal}
            >
              <Text style={styles.ocrActionButtonSecondaryText}>Brug original</Text>
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
              <Text style={styles.ocrActionButtonPrimaryText}>Brug oversat</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {showAssignee ? (
        <View style={styles.assigneeSection}>
          <Text style={styles.assigneeLabel}>Ansvarlig</Text>
          <View style={styles.assigneeChips}>
            {assignmentOptions
              .filter((option) => {
                if (option.id === "") return true;
                if (option.id === currentUser?.uid) return true;
                return canAssignOthers(projectRole);
              })
              .map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.assigneeChip,
                    assignedTo === option.id && styles.assigneeChipActive,
                  ]}
                  onPress={() => {
                    const name = option.id
                      ? option.label.replace(/^Mig \(/, "").replace(/\)$/, "")
                      : "";
                    onAssigneeChange(option.id, name);
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
                    {assignedTo === option.id && assignedToName && option.id !== currentUser?.uid
                      ? ` (${assignedToName})`
                      : null}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onCancel}>
          <Text style={styles.buttonSecondaryText}>Annuller</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, (!canSave || isSaving) && styles.buttonDisabled]}
          onPress={onSave}
          disabled={!canSave || isSaving}
        >
          <Text style={styles.buttonPrimaryText}>
            {isSaving ? "Gemmer..." : "Gem"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const themedStyles = (isDark: boolean) =>
  StyleSheet.create({
    form: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 20,
      padding: 24,
    },
    header: {
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 8,
    },
    helpText: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 12,
    },
    topSlot: {
      marginBottom: 12,
    },
    typeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
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
      height: 120,
      textAlignVertical: "top",
    },
    buttonRow: {
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
    imagePickerButton: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
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
    ocrActionLinks: {
      flexDirection: "row",
      gap: 12,
    },
    ocrCopyLink: {
      fontSize: 12,
      color: "#38bdf8",
      fontWeight: "600",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    ocrCopyLinkActive: {
      color: "#0f172a",
      backgroundColor: "#34d399",
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
    assigneeChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    assigneeChipTextActive: {
      color: "#0f172a",
    },
    aiSuggestionHint: {
      fontSize: 12,
      fontStyle: "italic",
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: -10,
      marginBottom: 12,
    },
  });
