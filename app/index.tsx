import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";

export default function IndexScreen() {
  const { user, loading, signInAnonymously, updateProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.name) {
      router.replace("/(tabs)");
    }
  }, [user, router]);

  const handleContinue = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setBusy(true);
    setError(null);
    try {
      if (!user) {
        await signInAnonymously(trimmedName);
      } else {
        await updateProfile({ name: trimmedName });
      }
      router.replace("/(tabs)");
    } catch (err) {
      console.log("Continue error", err);
      setError(err instanceof Error ? err.message : "Der skete en fejl");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Data Capture</Text>
      <Text style={styles.subtitle}>
        Indtast dit navn for at komme i gang
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Dit navn"
        placeholderTextColor="#94a3b8"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[
          styles.button,
          (!name.trim() || busy) && styles.buttonDisabled,
        ]}
        onPress={handleContinue}
        disabled={!name.trim() || busy}
      >
        <Text style={styles.buttonText}>
          {busy ? "Arbejder..." : "Fortsæt"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0f172a",
  },
  header: {
    fontSize: 32,
    fontWeight: "700",
    color: "#38bdf8",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
  },
  button: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#475569",
  },
  buttonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#f87171",
    marginBottom: 16,
    textAlign: "center",
    maxWidth: 320,
  },
});
