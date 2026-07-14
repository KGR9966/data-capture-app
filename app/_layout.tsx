import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { AuthProvider } from "../contexts/AuthContext";
import { ProjectProvider } from "../contexts/ProjectContext";
import { ThemeProvider } from "../contexts/ThemeContext";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ProjectProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="item" />
              </Stack>
            </ProjectProvider>
            <StatusBar style="auto" />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
