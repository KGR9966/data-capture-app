import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  getItemsByAssignee,
  unassignItemsFromMember,
} from "../../services/items";
import {
  addProjectMemberByEmail,
  createProject,
  Project,
  ProjectMember,
  removeProjectMember,
  subscribeToProjectMembers,
  subscribeToProjects,
  updateProjectMemberRole,
} from "../../services/projects";
import {
  canChangeMemberRole,
  canInviteMembers,
  canRemoveMember,
  getProjectRole,
  ProjectRole,
  ROLE_LABELS,
} from "../../services/roles";

const EDITABLE_ROLES: ProjectRole[] = ["admin", "editor", "viewer"];

export default function ProjectsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { activeProject, setActiveProject } = useProject();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [membersByProject, setMembersByProject] = useState<
    Record<string, ProjectMember[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteListVisible, setInviteListVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("editor");
  const [inviting, setInviting] = useState(false);

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

  // Subscribe to members for owned/shared projects the user owns or is admin in.
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribes: (() => void)[] = [];
    projects.forEach((project) => {
      const role = getProjectRole(project, user.uid, membersByProject[project.id] || []);
      if (canInviteMembers(role)) {
        const unsubscribe = subscribeToProjectMembers(project.id, (members) => {
          setMembersByProject((prev) => ({ ...prev, [project.id]: members }));
        });
        unsubscribes.push(unsubscribe);
      }
    });
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // membersByProject opdateres inde i callbacken; re-subscribe er ikke nødvendigt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, user?.uid]);

  const ownedProjects = useMemo(
    () => projects.filter((p) => p.ownerId === user?.uid),
    [projects, user?.uid]
  );

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
    if (!user?.uid || !canInviteMembers(getProjectRole(project, user.uid, membersByProject[project.id] || []))) return;
    setInviteProjectId(project.id);
    setInviteEmail("");
    setInviteRole("editor");
    setInviteListVisible(true);
  };

  const handleSendInvite = async () => {
    if (!inviteProjectId || !inviteEmail.trim()) return;
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert("Ugyldig email", "Indtast en gyldig emailadresse, f.eks. navn@domæne.dk");
      return;
    }
    setInviting(true);
    try {
      await addProjectMemberByEmail(inviteProjectId, normalizedEmail, inviteRole);
      setInviteEmail("");
      Alert.alert("Inviteret", `${normalizedEmail} er tilføjet som ${ROLE_LABELS[inviteRole]}.`);
    } catch (error) {
      console.log("Invite error", error);
      Alert.alert("Fejl", "Kunne ikke invitere medlemmet.");
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (
    projectId: string,
    member: ProjectMember,
    newRole: ProjectRole,
    myRole: ProjectRole | null
  ) => {
    if (!canChangeMemberRole(myRole, newRole)) {
      Alert.alert("Begrænset adgang", "Du har ikke rettighed til at sætte denne rolle.");
      return;
    }
    try {
      await updateProjectMemberRole(projectId, member.userId, newRole);
      Alert.alert("Rolle opdateret", `${member.email} er nu ${ROLE_LABELS[newRole]}.`);
    } catch (error) {
      console.log("Change role error", error);
      Alert.alert("Fejl", "Kunne ikke opdatere rollen.");
    }
  };

  const handleRemoveMember = async (
    projectId: string,
    member: ProjectMember,
    project: Project,
    myRole: ProjectRole | null
  ) => {
    if (!user?.uid) return;
    if (!canRemoveMember(myRole, member, project, user.uid)) {
      Alert.alert("Begrænset adgang", "Du kan ikke fjerne dette medlem.");
      return;
    }

    const assignedItems = member.userId
      ? await getItemsByAssignee(projectId, member.userId)
      : [];

    const confirmRemoval = async () => {
      try {
        if (member.userId) {
          await unassignItemsFromMember(projectId, member.userId);
        }
        await removeProjectMember(projectId, member.email, member.userId);
      } catch (error) {
        console.log("Remove member error", error);
        Alert.alert("Fejl", "Kunne ikke fjerne medlemmet.");
      }
    };

    if (assignedItems.length > 0) {
      Alert.alert(
        "Medlemmet er ansvarlig for sager",
        `${member.email} er ansvarlig for ${assignedItems.length} ${
          assignedItems.length === 1 ? "sag" : "sager"
        }. Hvis du fjerner medlemmet, fjernes deres ansvarlig også fra disse sager.`,
        [
          { text: "Annuller", style: "cancel" },
          {
            text: "Fjern alligevel",
            style: "destructive",
            onPress: confirmRemoval,
          },
        ]
      );
      return;
    }

    Alert.alert(
      "Fjern medlem",
      `Er du sikker på, at du vil fjerne ${member.email}?`,
      [
        { text: "Annuller", style: "cancel" },
        {
          text: "Fjern",
          style: "destructive",
          onPress: confirmRemoval,
        },
      ]
    );
  };

  const inviteProject = projects.find((p) => p.id === inviteProjectId);
  const inviteProjectMembers = inviteProjectId
    ? membersByProject[inviteProjectId] || []
    : [];
  const myRole = inviteProject && user?.uid
    ? getProjectRole(inviteProject, user.uid, inviteProjectMembers)
    : null;

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
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.addButton, styles.membersButton]}
            onPress={() => setInviteListVisible(true)}
          >
            <Text style={styles.addButtonText}>Medlemmer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Nyt</Text>
          </TouchableOpacity>
        </View>
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
          const members = membersByProject[item.id] || [];
          const role = user?.uid ? getProjectRole(item, user.uid, members) : null;
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
              {role ? (
                <Text style={styles.roleBadge}>{ROLE_LABELS[role]}</Text>
              ) : null}
              {canInviteMembers(role) ? (
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

      <Modal
        visible={inviteListVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setInviteListVisible(false);
          setInviteProjectId(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, styles.membersModalContent]}>
            <Text style={styles.modalHeader}>Medlemmer</Text>

            {/* Project selector tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.projectTabs}
              contentContainerStyle={styles.projectTabsContent}
            >
              {ownedProjects.length === 0 ? (
                <Text style={styles.emptyMemberText}>Du ejer ingen projekter endnu.</Text>
              ) : (
                ownedProjects.map((project) => {
                  const role = user?.uid
                    ? getProjectRole(project, user.uid, membersByProject[project.id] || [])
                    : null;
                  if (!canInviteMembers(role)) return null;
                  return (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.projectTab,
                        inviteProjectId === project.id && styles.projectTabActive,
                      ]}
                      onPress={() => {
                        setInviteProjectId(project.id);
                        setInviteEmail("");
                      }}
                    >
                      <Text
                        style={[
                          styles.projectTabText,
                          inviteProjectId === project.id && styles.projectTabTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {project.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {inviteProjectId && myRole && canInviteMembers(myRole) ? (
              <>
                <View style={styles.inviteRow}>
                  <TextInput
                    style={[styles.input, styles.inviteInput]}
                    placeholder="Email på ny medlem"
                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={handleSendInvite}
                  />
                  <View style={styles.rolePicker}>
                    {EDITABLE_ROLES.map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleChip,
                          inviteRole === role && styles.roleChipActive,
                        ]}
                        onPress={() => setInviteRole(role)}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            inviteRole === role && styles.roleChipTextActive,
                          ]}
                        >
                          {ROLE_LABELS[role]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonPrimary,
                      (!inviteEmail.trim() || inviting) && styles.buttonDisabled,
                    ]}
                    onPress={handleSendInvite}
                    disabled={!inviteEmail.trim() || inviting}
                  >
                    <Text style={styles.buttonPrimaryText}>
                      {inviting ? "Inviterer..." : "Inviter"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.membersList}>
                  {inviteProjectMembers.length === 0 ? (
                    <Text style={styles.emptyMemberText}>Ingen medlemmer endnu.</Text>
                  ) : (
                    inviteProjectMembers.map((member) => {
                      const isOwner = member.userId === inviteProject?.ownerId || member.role === "owner";
                      return (
                        <View key={member.userId} style={styles.memberRow}>
                          <View style={styles.memberInfo}>
                            <Text style={styles.memberEmail} numberOfLines={2}>
                              {member.email || member.userId}
                            </Text>
                            <Text style={styles.memberRole}>{ROLE_LABELS[member.role]}</Text>
                          </View>
                          {!isOwner ? (
                            <View style={styles.memberActions}>
                              {EDITABLE_ROLES.map((role) =>
                                canChangeMemberRole(myRole, role) ? (
                                  <TouchableOpacity
                                    key={role}
                                    style={[
                                      styles.roleChipSmall,
                                      member.role === role && styles.roleChipSmallActive,
                                    ]}
                                    onPress={() =>
                                      handleChangeRole(inviteProjectId, member, role, myRole)
                                    }
                                  >
                                    <Text
                                      style={[
                                        styles.roleChipSmallText,
                                        member.role === role &&
                                          styles.roleChipSmallTextActive,
                                      ]}
                                    >
                                      {ROLE_LABELS[role]}
                                    </Text>
                                  </TouchableOpacity>
                                ) : null
                              )}
                              {canRemoveMember(myRole, member, inviteProject!, user!.uid) ? (
                                <TouchableOpacity
                                  style={styles.removeMemberButton}
                                  onPress={() =>
                                    handleRemoveMember(inviteProjectId, member, inviteProject!, myRole)
                                  }
                                >
                                  <Text style={styles.removeMemberText}>Fjern</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          ) : (
                            <Text style={styles.ownerBadge}>Ejer</Text>
                          )}
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </>
            ) : (
              <Text style={styles.emptyMemberText}>
                Vælg et projekt for at se og administrere medlemmer.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, styles.membersCloseButton]}
              onPress={() => {
                setInviteListVisible(false);
                setInviteProjectId(null);
              }}
            >
              <Text style={styles.buttonPrimaryText}>Luk</Text>
            </TouchableOpacity>
          </View>
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
    headerButtons: {
      flexDirection: "row",
      gap: 8,
    },
    addButton: {
      backgroundColor: "#38bdf8",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    membersButton: {
      backgroundColor: "#34d399",
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
    roleBadge: {
      marginTop: 8,
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
      maxWidth: 420,
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
    membersModalContent: {
      maxHeight: "85%",
      paddingVertical: 16,
    },
    projectTabs: {
      maxHeight: 54,
      marginBottom: 12,
    },
    projectTabsContent: {
      flexDirection: "row",
      gap: 8,
    },
    projectTab: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    projectTabActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    projectTabText: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
      maxWidth: 160,
    },
    projectTabTextActive: {
      color: "#0f172a",
    },
    inviteRow: {
      gap: 10,
      marginBottom: 12,
    },
    inviteInput: {
      marginBottom: 0,
    },
    rolePicker: {
      flexDirection: "row",
      gap: 8,
      marginVertical: 8,
    },
    roleChip: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      alignItems: "center",
    },
    roleChipActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    roleChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    roleChipTextActive: {
      color: "#0f172a",
    },
    membersList: {
      maxHeight: 360,
      marginBottom: 12,
    },
    memberRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#334155" : "#e2e8f0",
    },
    memberInfo: {
      flex: 1,
      minWidth: 120,
      marginRight: 8,
    },
    memberEmail: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
      lineHeight: 18,
    },
    memberRole: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 2,
    },
    memberActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },
    roleChipSmall: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    roleChipSmallActive: {
      backgroundColor: "#38bdf8",
      borderColor: "#38bdf8",
    },
    roleChipSmallText: {
      fontSize: 11,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    roleChipSmallTextActive: {
      color: "#0f172a",
    },
    removeMemberButton: {
      marginLeft: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    removeMemberText: {
      color: "#f87171",
      fontWeight: "600",
      fontSize: 12,
    },
    ownerBadge: {
      fontSize: 12,
      fontWeight: "700",
      color: "#34d399",
    },
    membersCloseButton: {
      alignSelf: "stretch",
      marginTop: 4,
    },
    emptyMemberText: {
      fontSize: 14,
      color: isDark ? "#94a3b8" : "#64748b",
      textAlign: "center",
      marginVertical: 20,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
