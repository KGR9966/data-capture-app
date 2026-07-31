import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
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

import { useTheme } from "../contexts/ThemeContext";
import { Reminder, ReminderRepeat } from "../services/reminders";

interface ReminderModalProps {
  visible: boolean;
  title: string;
  existingReminder?: Reminder | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: {
    scheduledAt: number;
    repeat: ReminderRepeat;
    note?: string;
  }) => void;
  onDelete?: () => void;
}

const REPEAT_OPTIONS: { value: ReminderRepeat; label: string }[] = [
  { value: "once", label: "En gang" },
  { value: "daily", label: "Daglig" },
  { value: "weekly", label: "Ugentlig" },
];

export default function ReminderModal({
  visible,
  title,
  existingReminder,
  saving,
  onClose,
  onSave,
  onDelete,
}: ReminderModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  const [date, setDate] = useState(() => {
    if (existingReminder) {
      return new Date(existingReminder.scheduledAt);
    }
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now;
  });
  const [repeat, setRepeat] = useState<ReminderRepeat>(
    existingReminder?.repeat || "once"
  );
  const [note, setNote] = useState(existingReminder?.note || "");

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDate((prev) => {
        const next = new Date(selectedDate);
        next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
        return next;
      });
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDate((prev) => {
        const next = new Date(prev);
        next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        return next;
      });
    }
  };

  const handleSave = () => {
    onSave({
      scheduledAt: date.getTime(),
      repeat,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={onClose} />
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.header}>{existingReminder ? "Rediger påmindelse" : "Ny påmindelse"}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>{title}</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Dato</Text>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                  themeVariant={isDark ? "dark" : "light"}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Tid</Text>
                <DateTimePicker
                  value={date}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                  themeVariant={isDark ? "dark" : "light"}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Gentagelse</Text>
                <View style={styles.row}>
                  {REPEAT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        repeat === option.value && styles.chipActive,
                      ]}
                      onPress={() => setRepeat(option.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          repeat === option.value && styles.chipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Note (valgfri)</Text>
                <TextInput
                  style={styles.input}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Din note til påmindelsen..."
                  placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  multiline
                  maxLength={200}
                />
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.buttonSecondaryText}>Annuller</Text>
                </TouchableOpacity>
                {existingReminder && onDelete ? (
                  <TouchableOpacity
                    style={[styles.button, styles.buttonDanger, saving && styles.buttonDisabled]}
                    onPress={onDelete}
                    disabled={saving}
                  >
                    <Text style={styles.buttonDangerText}>Slet</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.buttonPrimaryText}>{saving ? "Gemmer..." : "Gem"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const themedStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingBottom: 24,
      maxHeight: "90%",
    },
    content: {
      paddingTop: 16,
      paddingBottom: 24,
    },
    header: {
      fontSize: 20,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 16,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 6,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    chipActive: {
      backgroundColor: "#38bdf8",
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    chipTextActive: {
      color: "#0f172a",
    },
    input: {
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      color: isDark ? "#e2e8f0" : "#0f172a",
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      minHeight: 80,
      textAlignVertical: "top",
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    button: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 12,
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
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonSecondary: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    buttonSecondaryText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    buttonDanger: {
      backgroundColor: "#f87171",
    },
    buttonDangerText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
  });
