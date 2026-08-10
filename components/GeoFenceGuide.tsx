import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import { ChecklistLocation } from "../services/checklists";
import {
  buildGeofenceUrl,
  buildOpenAutomationAppUrl,
  geofenceGuideText,
} from "../services/geofence";
import { copyToClipboard } from "../services/deeplinks";

interface GeoFenceGuideProps {
  visible: boolean;
  checklistId: string;
  ownerId: string;
  location: ChecklistLocation;
  projectId?: string;
  onClose: () => void;
}

export default function GeoFenceGuide({
  visible,
  checklistId,
  ownerId,
  location,
  projectId,
  onClose,
}: GeoFenceGuideProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = themedStyles(isDark);
  const platform = Platform.OS as "ios" | "android";

  const arrivalUrl = buildGeofenceUrl(checklistId, ownerId, location, projectId, "arrival");
  const departureUrl = buildGeofenceUrl(checklistId, ownerId, location, projectId, "departure");
  const guideText = geofenceGuideText(platform, location.name, arrivalUrl, departureUrl);
  const automationUrl = buildOpenAutomationAppUrl(platform);

  const handleCopyArrival = async () => {
    await copyToClipboard(arrivalUrl);
    Alert.alert("Kopieret", "Ankomst-linket er kopieret til udklipsholderen.");
  };

  const handleCopyDeparture = async () => {
    await copyToClipboard(departureUrl);
    Alert.alert("Kopieret", "Afgang-linket er kopieret til udklipsholderen.");
  };

  const handleCopyGuide = async () => {
    await copyToClipboard(guideText);
    Alert.alert("Kopieret", "Guiden er kopieret til udklipsholderen.");
  };

  const handleOpenAutomationApp = async () => {
    const supported = await Linking.canOpenURL(automationUrl);
    if (supported) {
      await Linking.openURL(automationUrl);
    } else {
      Alert.alert(
        "Kunne ikke åbne app",
        platform === "ios"
          ? "Sørg for, at Shortcuts-appen er installeret."
          : "Åbn Automate eller Tasker manuelt."
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.header}>{location.name}</Text>
            <Text style={styles.subtitle}>
              Få din telefon til at åbne denne liste, når du er tæt på stedet.
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Ankomst-link</Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkText} numberOfLines={1}>
                  {arrivalUrl}
                </Text>
                <TouchableOpacity style={styles.iconButton} onPress={handleCopyArrival}>
                  <Ionicons name="copy-outline" size={20} color="#38bdf8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Afgang-link</Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkText} numberOfLines={1}>
                  {departureUrl}
                </Text>
                <TouchableOpacity style={styles.iconButton} onPress={handleCopyDeparture}>
                  <Ionicons name="copy-outline" size={20} color="#38bdf8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Guide</Text>
              <Text style={styles.guideText}>{guideText}</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleCopyGuide}>
              <Text style={styles.primaryButtonText}>Kopier guide</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenAutomationApp}>
              <Text style={styles.secondaryButtonText}>
                {platform === "ios" ? "Åbn Shortcuts" : "Åbn Automate / Tasker"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Luk</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
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
    section: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 6,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    linkText: {
      flex: 1,
      fontSize: 13,
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    iconButton: {
      padding: 4,
    },
    guideText: {
      fontSize: 14,
      color: isDark ? "#e2e8f0" : "#0f172a",
      lineHeight: 20,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    primaryButton: {
      backgroundColor: "#38bdf8",
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 10,
    },
    primaryButtonText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    secondaryButton: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 10,
    },
    secondaryButtonText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "700",
      fontSize: 15,
    },
    closeButton: {
      alignItems: "center",
      paddingVertical: 12,
    },
    closeButtonText: {
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: 15,
      fontWeight: "600",
    },
  });
