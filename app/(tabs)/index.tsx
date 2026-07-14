import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  addProjectMemberByEmail,
  createProject,
  Project,
  subscribeToProjects,
} from "../../services/projects";

export default function ProjectsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { activeProject, setActiveProject } = useProject();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToProjects(
      user.uid,
      user.email || null,
      (data) => {
        setProjects(data);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user?.uid, user?.email]);

  const handleCreateProject = async () => {
    if (!user?.uid || !newProjectName.trim()) return;
    setCreating(true);
    try {
      const project = await createProject(
        newProjectName.trim(),
        user.uid,
        user.email || undefined,
        newProjectDescription.trim()
      );
      setActiveProject(project);
      setModalVisible(false);
      setNewProjectName("");
      setNewProjectDescription("");
      router.push("/(tabs)/board");
    } catch (error) {
      console.log("Create project error", error);
      Alert.alert("Fejl", "Kunne ikke oprette projektet.");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    router.push("/(tabs)/board");
  };

  const handleInviteMember = (project: Project) => {
    if (!user?.uid || project.ownerId !== user.uid) return;
    Alert.prompt(
      "Inviter medlem",
      "Tilføj en email til projektet",
      async (email) => {
        if (!email?.trim()) return;
        try {
          await addProjectMemberByEmail(project.id, email.trim());
          Alert.alert("Inviteret", email + " kan nu se projektet.");
        } catch (error) {
          console.log("Invite error", error);
          Alert.alert("Fejl", "Kunne ikke invitere medlemmet.");
        }
      },
      "plain-text",
      "",
      "email-address"
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDark ? "#38bdf8" : "#0284c7"} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Projekter</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Nyt</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Ingen projekter endnu</Text>
            <Text style={styles.emptySubtitle}>
              Opret et projekt for at begynde at indsamle noter, idéer og fejl.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = activeProject?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.projectCard, isActive && styles.projectCardActive]}
              onPress={() => handleSelectProject(item)}
              onLongPress={() => handleInviteMember(item)}
            >
              <Text style={styles.projectName}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.projectDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              {isActive ? (
                <Text style={styles.activeBadge}>Aktiv</Text>
              ) : null}
              {item.ownerId === user?.uid ? (
                <Text style={styles.inviteHint}>Hold inde for at invitere</Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Nyt projekt</Text>
              <TextInput
                style={styles.input}
                placeholder="Projektnavn"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                value={newProjectName}
                onChangeText={setNewProjectName}
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Beskrivelse (valgfrit)"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                value={newProjectDescription}
                onChangeText={setNewProjectDescription}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                blurOnSubmit
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonSecondaryText}>Annuller</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonPrimary,
                    (!newProjectName.trim() || creating) && styles.buttonDisabled,
                  ]}
                  onPress={handleCreateProject}
                  disabled={!newProjectName.trim() || creating}
                >
                  <Text style={styles.buttonPrimaryText}>
                    {creating ? "Opretter..." : "Opret"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const themedStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      paddingTop: 60,
      paddingHorizontal: 16,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    header: {
      fontSize: 28,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    addButton: {
      backgroundColor: "#38bdf8",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addButtonText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    list: {
      paddingBottom: 24,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: "center",
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#1e293b",
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      textAlign: "center",
      paddingHorizontal: 24,
    },
    projectCard: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    projectCardActive: {
      borderColor: "#38bdf8",
      borderWidth: 2,
    },
    projectName: {
      fontSize: 17,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 4,
    },
    projectDescription: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    activeBadge: {
      marginTop: 10,
      color: "#38bdf8",
      fontSize: 12,
      fontWeight: "700",
    },
    inviteHint: {
      marginTop: 6,
      color: isDark ? "#64748b" : "#94a3b8",
      fontSize: 11,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.6)",
      padding: 16,
    },
    modalScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 24,
    },
    modalContent: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 16,
      padding: 20,
    },
    modalHeader: {
      fontSize: 20,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 16,
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
      height: 80,
      textAlignVertical: "top",
    },
    modalButtons: {
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
  });
