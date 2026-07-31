import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  getNotificationPermissionStatus,
  NotificationPermissionStatus,
  registerForPushNotificationsAsync,
  scheduleTestNotification,
} from "../../services/notifications";

export default function SettingsScreen() {
  const { user, logOut } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const router = useRouter();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>("undetermined");
  const [checkingPermission, setCheckingPermission] = useState(true);

  const styles = themedStyles(isDark);

  useEffect(() => {
    registerForPushNotificationsAsync().then(setPushToken).catch(console.log);
    getNotificationPermissionStatus()
      .then(setPermissionStatus)
      .catch(console.log)
      .finally(() => setCheckingPermission(false));
  }, []);

  const handleRegisterPush = async () => {
    setRegistering(true);
    try {
      const token = await registerForPushNotificationsAsync();
      setPushToken(token);
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      if (token) {
        Alert.alert("Push-token registreret", token);
      } else {
        Alert.alert("Ingen tilladelse", "Push-notifikationer blev ikke tilladt.");
      }
    } catch (error) {
      console.log("Push registration error", error);
      Alert.alert("Fejl", "Kunne ikke registrere push-token.");
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert("Fejl", "Kunne ikke åbne indstillinger.");
    });
  };

  const handleTestNotification = async () => {
    try {
      await scheduleTestNotification();
      Alert.alert("Testnotifikation planlagt", "Du bør se den om få sekunder.");
    } catch (error) {
      console.log("Test notification error", error);
      Alert.alert("Fejl", "Kunne ikke planlægge testnotifikation.");
    }
  };

  const permissionLabel =
    permissionStatus === "granted"
      ? "Tilladt"
      : permissionStatus === "denied"
      ? "Afslået"
      : "Ikke spurgt";

  const handleLogout = async () => {
    try {
      await logOut();
      router.replace("/");
    } catch (error) {
      console.log("Logout error", error);
      Alert.alert("Fejl", "Kunne ikke logge ud.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Indstillinger</Text>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Bruger</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Navn</Text>
          <Text style={styles.value}>{user?.displayName || user?.name || "Ukendt"}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Email / ID</Text>
          <Text style={[styles.value, styles.mono]} numberOfLines={1}>
            {user?.email || user?.uid || "Anonym"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Udseende</Text>
        <View style={[styles.card, styles.row]}>
          <Text style={styles.value}>Mørk tilstand</Text>
          <Switch
            value={theme === "dark"}
            onValueChange={toggleTheme}
            thumbColor={theme === "dark" ? "#38bdf8" : "#94a3b8"}
            trackColor={{ false: "#334155", true: "#0ea5e9" }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Notifikationer</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Tilladelse</Text>
          <Text style={styles.value}>
            {checkingPermission ? "Tjekker..." : permissionLabel}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Push-token</Text>
          <Text style={[styles.value, styles.mono, styles.token]} numberOfLines={3}>
            {pushToken || "Ikke registreret"}
          </Text>
          <TouchableOpacity
            style={[styles.button, registering && styles.buttonDisabled]}
            onPress={handleRegisterPush}
            disabled={registering}
          >
            <Text style={styles.buttonText}>
              {registering ? "Registrerer..." : "Registrer push"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, styles.testButton]}
            onPress={handleTestNotification}
          >
            <Text style={styles.buttonSecondaryText}>Afprøv notifikation</Text>
          </TouchableOpacity>
          {permissionStatus === "denied" ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, styles.testButton]}
              onPress={handleOpenSettings}
            >
              <Text style={styles.buttonSecondaryText}>Åbn indstillinger</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log ud</Text>
      </TouchableOpacity>
    </ScrollView>
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
    header: {
      fontSize: 28,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "700",
      color: isDark ? "#94a3b8" : "#64748b",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    card: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 4,
    },
    value: {
      fontSize: 16,
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    mono: {
      fontFamily: "monospace",
      fontSize: 13,
      color: isDark ? "#cbd5e1" : "#475569",
    },
    token: {
      marginBottom: 12,
    },
    button: {
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
    },
    buttonText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonSecondary: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    buttonSecondaryText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
      fontWeight: "600",
    },
    testButton: {
      marginTop: 10,
    },
    logoutButton: {
      backgroundColor: "#f87171",
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
    },
    logoutText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 16,
    },
  });
