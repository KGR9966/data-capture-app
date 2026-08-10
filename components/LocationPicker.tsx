import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
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
import { ChecklistLocation } from "../services/checklists";

interface LocationPickerProps {
  visible: boolean;
  existingLocation?: ChecklistLocation | null;
  onClose: () => void;
  onSave: (location: Omit<ChecklistLocation, "id" | "createdAt" | "updatedAt">) => void;
  onDelete?: () => void;
}

const PRESET_RADII = [100, 250, 500, 1000, 2000, 5000];
const MIN_RADIUS = 50;
const MAX_RADIUS = 50000;

function parseNumber(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

export default function LocationPicker({
  visible,
  existingLocation,
  onClose,
  onSave,
  onDelete,
}: LocationPickerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  const [name, setName] = useState(existingLocation?.name || "");
  const [latitude, setLatitude] = useState(
    existingLocation?.latitude !== undefined ? String(existingLocation.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    existingLocation?.longitude !== undefined ? String(existingLocation.longitude) : ""
  );
  const [customRadius, setCustomRadius] = useState(
    existingLocation?.radiusMeters && !PRESET_RADII.includes(existingLocation.radiusMeters)
      ? String(existingLocation.radiusMeters)
      : ""
  );
  const [selectedRadius, setSelectedRadius] = useState<number | null>(
    existingLocation?.radiusMeters && PRESET_RADII.includes(existingLocation.radiusMeters)
      ? existingLocation.radiusMeters
      : existingLocation?.radiusMeters
        ? null
        : 500
  );

  const handleRadiusSelect = (radius: number) => {
    setSelectedRadius(radius);
    setCustomRadius("");
  };

  const handleCustomRadiusChange = (value: string) => {
    setCustomRadius(value);
    const num = parseNumber(value);
    setSelectedRadius(num !== null && PRESET_RADII.includes(num) ? num : null);
  };

  const getRadiusMeters = (): number | null => {
    if (customRadius.trim()) {
      const num = parseNumber(customRadius);
      if (num !== null) return num;
    }
    return selectedRadius;
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Navn mangler", "Angiv et navn for stedet.");
      return;
    }

    const lat = parseNumber(latitude);
    const lng = parseNumber(longitude);
    if (lat === null || lng === null) {
      Alert.alert("Koordinater mangler", "Angiv gyldig bredde- og længdegrad.");
      return;
    }
    if (lat < -90 || lat > 90) {
      Alert.alert("Ugyldig breddegrad", "Breddegrad skal være mellem -90 og 90.");
      return;
    }
    if (lng < -180 || lng > 180) {
      Alert.alert("Ugyldig længdegrad", "Længdegrad skal være mellem -180 og 180.");
      return;
    }

    const radius = getRadiusMeters();
    if (radius === null) {
      Alert.alert("Afstand mangler", "Vælg en radius eller angiv en brugerdefineret afstand.");
      return;
    }
    if (radius < MIN_RADIUS || radius > MAX_RADIUS) {
      Alert.alert("Ugyldig afstand", `Afstanden skal være mellem ${MIN_RADIUS} m og ${MAX_RADIUS} m.`);
      return;
    }

    onSave({
      name: trimmedName,
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      notifyOnArrival: existingLocation?.notifyOnArrival ?? true,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={onClose} />
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.header}>
                {existingLocation ? "Rediger sted" : "Tilknyt sted"}
              </Text>
              <Text style={styles.subtitle}>
                Gem en placering, så du kan få din telefon til at åbne listen, når du er tæt på.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Navn</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="F.eks. Silvan Hillerød"
                  placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Breddegrad</Text>
                <TextInput
                  style={styles.input}
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="F.eks. 57.0000"
                  placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Længdegrad</Text>
                <TextInput
                  style={styles.input}
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="F.eks. 12.0000"
                  placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Radius</Text>
                <View style={styles.radiusRow}>
                  {PRESET_RADII.map((radius) => (
                    <TouchableOpacity
                      key={radius}
                      style={[
                        styles.radiusChip,
                        selectedRadius === radius && !customRadius && styles.radiusChipActive,
                      ]}
                      onPress={() => handleRadiusSelect(radius)}
                    >
                      <Text
                        style={[
                          styles.radiusChipText,
                          selectedRadius === radius && !customRadius && styles.radiusChipTextActive,
                        ]}
                      >
                        {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.customRadiusRow}>
                  <Text style={styles.label}>Eller brugerdefineret (meter)</Text>
                  <TextInput
                    style={[styles.input, styles.customRadiusInput]}
                    value={customRadius}
                    onChangeText={handleCustomRadiusChange}
                    placeholder="F.eks. 750"
                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={onClose}
                >
                  <Text style={styles.buttonSecondaryText}>Annuller</Text>
                </TouchableOpacity>
                {existingLocation && onDelete ? (
                  <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={onDelete}>
                    <Text style={styles.buttonDangerText}>Slet</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={handleSave}>
                  <Text style={styles.buttonPrimaryText}>Gem</Text>
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
    input: {
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      color: isDark ? "#e2e8f0" : "#0f172a",
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    radiusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    radiusChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      marginBottom: 8,
    },
    radiusChipActive: {
      backgroundColor: "#38bdf8",
    },
    radiusChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    radiusChipTextActive: {
      color: "#0f172a",
    },
    customRadiusRow: {
      marginTop: 4,
    },
    customRadiusInput: {
      marginTop: 6,
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
