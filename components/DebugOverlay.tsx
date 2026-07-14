import Constants from "expo-constants";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";

const IS_DEV = __DEV__ || Constants.expoConfig?.extra?.debug === true;

export function DebugOverlay() {
  const { user, loading: authLoading } = useAuth();
  const { activeProject, loading: projectLoading } = useProject();

  if (!IS_DEV) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.line}>{`Auth: ${authLoading ? "loading" : user ? user.uid?.slice(0, 8) : "none"}`}</Text>
      <Text style={styles.line}>{`Name: ${user?.name || user?.displayName || "-"}`}</Text>
      <Text style={styles.line}>{`Project: ${projectLoading ? "loading" : activeProject ? `${activeProject.name} (${activeProject.id.slice(0, 6)})` : "none"}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 40,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 8,
    padding: 8,
    zIndex: 9999,
  },
  line: {
    color: "#38bdf8",
    fontSize: 10,
    fontFamily: "monospace",
    marginBottom: 2,
  },
});
