import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/ErrorBoundary";
import NotificationResponseHandler from "../components/NotificationResponseHandler";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ProjectProvider } from "../contexts/ProjectContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { initializeNetworkListener } from "../services/checklistsOffline";

function NetworkListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    return initializeNetworkListener(user.uid);
  }, [user?.uid]);

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ProjectProvider>
              <NetworkListener />
              <NotificationResponseHandler />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="item" />
                <Stack.Screen name="checklist" />
                <Stack.Screen name="open-list" />
              </Stack>
            </ProjectProvider>
            <StatusBar style="auto" />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
