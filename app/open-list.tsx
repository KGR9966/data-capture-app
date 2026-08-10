import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";

export default function OpenListScreen() {
  const { id, projectId } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const listId = typeof id === "string" ? id : undefined;
    const projectIdParam = typeof projectId === "string" ? `&projectId=${encodeURIComponent(projectId)}` : "";
    if (listId) {
      router.replace(`/checklist?id=${listId}${projectIdParam}` as any);
    }
  }, [id, projectId, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={isDark ? "#38bdf8" : "#0284c7"} />
      <Text style={styles.text}>Åbner liste...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  text: {
    color: "#94a3b8",
    fontSize: 14,
  },
});
