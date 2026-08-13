import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import GeoFenceGuide from "../components/GeoFenceGuide";
import LocationPicker from "../components/LocationPicker";
import ReminderModal from "../components/ReminderModal";
import {
  addChecklistLocation,
  Checklist,
  ChecklistItem,
  ChecklistLocation,
  deleteChecklistLocation,
  findUserByEmail,
  getChecklistById,
  getSeedUserEmail,
  shareChecklist,
  shareChecklistText,
  subscribeToChecklistItems,
  synchronizeDynamicChecklist,
  toggleChecklistLocationArrival,
  unshareChecklist,
  updateChecklistLocation,
} from "../services/checklists";
import { subscribeToItems } from "../services/items";
import {
  compactPendingOps,
  deleteChecklistAndClearCache,
  flushPendingOps,
  getPendingOpsForChecklist,
  isOnline,
  loadCachedItems,
  PendingOp,
  saveCachedItems,
  toggleChecklistPointOffline,
} from "../services/checklistsOffline";
import {
  createReminder,
  deleteReminder,
  getRemindersForChecklist,
  Reminder,
  subscribeToReminders,
  updateReminder,
} from "../services/reminders";
import { scheduleGeofenceNotification, suggestPlacesForChecklist } from "../services/geofence";

function safeGoBack(router: ReturnType<typeof useRouter>) {
  try {
    if ("canGoBack" in router && typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/checklists");
    }
  } catch {
    router.replace("/checklists");
  }
}

function formatDate(ts: any) {
  if (!ts) return "";
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChecklistDetailScreen() {
  const { id, userId, projectId, geofence, event, locationId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [sharing, setSharing] = useState(false);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderTargetItem, setReminderTargetItem] = useState<ChecklistItem | null>(null);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("editor");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ChecklistLocation | null>(null);
  const [guideLocation, setGuideLocation] = useState<ChecklistLocation | null>(null);
  const [geofenceBanner, setGeofenceBanner] = useState<{ name: string; event: "arrival" | "departure" } | null>(null);
  const checklistId = typeof id === "string" ? id : undefined;
  const ownerIdParam = typeof userId === "string" ? userId : undefined;
  const projectIdParam = typeof projectId === "string" ? projectId : undefined;
  const geofenceParam = typeof geofence === "string" ? geofence : undefined;
  const eventParam = typeof event === "string" ? event : undefined;
  const locationIdParam = typeof locationId === "string" ? locationId : undefined;
  const dynamicSyncLock = React.useRef<Promise<void>>(Promise.resolve());
  const checklistRef = React.useRef<Checklist | null>(null);
  const notifiedEventRef = React.useRef<{ locationId?: string; event?: string } | null>(null);
  const pendingOpsRef = React.useRef<PendingOp[]>(pendingOps);

  const isDark = theme === "dark";
  const styles = themedStyles(isDark);
  const [loading, setLoading] = useState(!checklistId);

  // Keep a mutable ref so the dynamic sync callback always uses the latest checklist.
  useEffect(() => {
    checklistRef.current = checklist;
  }, [checklist]);

  // Network state
  useEffect(() => {
    const check = async () => setOnline(await isOnline());
    check();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected =
        state.isConnected === true && state.isInternetReachable !== false;
      setOnline(connected);
    });
    return () => unsubscribe();
  }, []);

  const refreshPendingOps = async () => {
    if (!user?.uid || !checklistId) return;
    const ops = await getPendingOpsForChecklist(user.uid, checklistId);
    pendingOpsRef.current = ops;
    setPendingOps(ops);
  };

  const applyPendingOps = (
    serverItems: ChecklistItem[],
    ops: PendingOp[]
  ): ChecklistItem[] => {
    const byId = new Map(serverItems.map((i) => [i.id, { ...i }]));
    for (const op of ops) {
      if (op.type === "toggleChecklistItem") {
        const item = byId.get(op.payload.itemId as string);
        if (item) {
          item.isCompleted = op.payload.completed as boolean;
          item.isPending = true;
        }
      } else if (op.type === "updateChecklistItem") {
        const item = byId.get(op.payload.itemId as string);
        if (item) {
          Object.assign(item, op.payload.updates);
          item.isPending = true;
        }
      } else if (op.type === "deleteChecklistItem") {
        byId.delete(op.payload.itemId as string);
      } else if (op.type === "deleteChecklist") {
        return [];
      }
    }
    return Array.from(byId.values());
  };

  useEffect(() => {
    if (!checklistId) return;
    let unsubscribeItems: (() => void) | undefined;
    let unsubscribeReminders: (() => void) | undefined;
    let unsubscribeProjectItems: (() => void) | undefined;

    const loadCachedAndServer = async () => {
      const cached = await loadCachedItems(checklistId);
      if (cached.length > 0) {
        setItems(cached);
        setLoading(false);
      }

      try {
        const data = await getChecklistById(
          checklistId,
          projectIdParam,
          ownerIdParam || user?.uid
        );
        setChecklist(data);
        if (data) {
          unsubscribeItems = subscribeToChecklistItems(
            checklistId,
            (listItems) => {
              saveCachedItems(checklistId, listItems);
              const merged = applyPendingOps(listItems, pendingOpsRef.current);
              setItems(merged);
            },
            data.projectId,
            data.ownerId || ownerIdParam || user?.uid
          );

          if (data.isDynamic && data.projectId) {
            unsubscribeProjectItems = subscribeToItems(data.projectId, (projectItems) => {
              // Serialize dynamic sync calls to prevent concurrent syncs from
              // reading the same stale snapshot and creating duplicate items.
              dynamicSyncLock.current = dynamicSyncLock.current
                .then(async () => {
                  const currentChecklist = checklistRef.current ?? data;
                  await synchronizeDynamicChecklist(currentChecklist, projectItems);
                })
                .catch((error) => {
                  console.error("[checklist] dynamic sync error:", error);
                });
            });
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    loadCachedAndServer();

    const checkGeofenceEvent = () => {
      if (geofenceParam !== "true" || !locationIdParam || !checklistId) return;
      const data = checklist;
      if (!data) return;
      const location = (data.locations || []).find((loc) => loc.id === locationIdParam);
      if (!location) return;

      const nextEvent = eventParam === "departure" ? "departure" : "arrival";
      // Use functional update so identical events don't recreate the state object
      // and trigger the notification effect repeatedly.
      setGeofenceBanner((prev) => {
        if (prev?.name === location.name && prev?.event === nextEvent) return prev;
        return { name: location.name, event: nextEvent };
      });
    };

    checkGeofenceEvent();

    if (user?.uid) {
      unsubscribeReminders = subscribeToReminders(user.uid, (all) => {
        setReminders(
          all.filter(
            (r) => r.targetType === "checklistItem" && r.targetId === checklistId
          )
        );
      });
      getRemindersForChecklist(user.uid, checklistId)
        .then((initial) => setReminders(initial))
        .catch(() => {});
      getPendingOpsForChecklist(user.uid, checklistId)
        .then((ops) => {
          pendingOpsRef.current = ops;
          setPendingOps(ops);
        })
        .catch(() => {});
    }

    return () => {
      if (unsubscribeItems) unsubscribeItems();
      if (unsubscribeReminders) unsubscribeReminders();
      if (unsubscribeProjectItems) unsubscribeProjectItems();
    };
  }, [
    checklistId,
    ownerIdParam,
    projectIdParam,
    user?.uid,
    geofenceParam,
    eventParam,
    locationIdParam,
  ]);

  const openItemCount = useMemo(
    () => items.filter((i) => !i.isCompleted).length,
    [items]
  );

  useEffect(() => {
    if (!geofenceBanner || !locationIdParam || !eventParam) return;

    // Guard against repeated notifications for the same geofence event.
    if (
      notifiedEventRef.current?.locationId === locationIdParam &&
      notifiedEventRef.current?.event === eventParam
    ) {
      return;
    }

    notifiedEventRef.current = { locationId: locationIdParam, event: eventParam };

    scheduleGeofenceNotification(
      geofenceBanner.name,
      openItemCount,
      geofenceBanner.event
    ).catch(() => {});
  }, [geofenceBanner, openItemCount, locationIdParam, eventParam]);

  const openItems = useMemo(
    () =>
      items
        .filter((i) => !i.isCompleted)
        .sort((a, b) => a.title.localeCompare(b.title, "da-DK")),
    [items]
  );

  const completedItems = useMemo(
    () =>
      items
        .filter((i) => i.isCompleted)
        .sort((a, b) => {
          const aTime = a.completedAt?.toMillis?.() || 0;
          const bTime = b.completedAt?.toMillis?.() || 0;
          return bTime - aTime;
        }),
    [items]
  );

  const sortedItems = useMemo(
    () => [...openItems, ...completedItems],
    [openItems, completedItems]
  );

  const canManageSharing = useMemo(
    () => !!checklist && !checklist.projectId && checklist.ownerId === user?.uid,
    [checklist, user?.uid]
  );

  const canManageLocations = useMemo(
    () => !!checklist && checklist.ownerId === user?.uid,
    [checklist, user?.uid]
  );

  const suggestedPlaces = useMemo(
    () => (checklist ? suggestPlacesForChecklist(checklist.name, items.map((i) => i.title)) : []),
    [checklist, items]
  );

  const refreshChecklist = async () => {
    if (!checklistId) return;
    try {
      const data = await getChecklistById(
        checklistId,
        undefined,
        ownerIdParam || user?.uid
      );
      if (data) setChecklist(data);
    } catch (error) {
      console.error("[refreshChecklist] error:", error);
    }
  };

  const handleToggleItem = async (item: ChecklistItem) => {
    if (!checklist || !user?.uid) return;
    const nextCompleted = !item.isCompleted;
    try {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, isCompleted: nextCompleted, isPending: true }
            : i
        )
      );
      const newOp = await toggleChecklistPointOffline(
        checklist,
        item,
        nextCompleted,
        user.uid
      );
      pendingOpsRef.current = compactPendingOps([...pendingOpsRef.current, newOp]);
      await refreshPendingOps();
    } catch {
      Alert.alert("Fejl", "Kunne ikke opdatere punktet.");
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isCompleted: item.isCompleted, isPending: false } : i
        )
      );
    }
  };

  const handleShare = async () => {
    if (!checklist) return;
    setSharing(true);
    try {
      await shareChecklistText(checklist, items);
    } catch {
      Alert.alert("Fejl", "Kunne ikke dele listen.");
    } finally {
      setSharing(false);
    }
  };

  const openShareModal = () => {
    setShareEmail("");
    setShareRole("editor");
    setShareError(null);
    setShareModalVisible(true);
  };

  const closeShareModal = () => {
    if (shareLoading) return;
    setShareModalVisible(false);
  };

  const handleShareWithUser = async () => {
    if (!checklist || !user?.uid) return;
    const email = shareEmail.trim().toLowerCase();
    if (!email) {
      setShareError("Indtast en email.");
      return;
    }
    if (email === user.email?.toLowerCase()) {
      setShareError("Du kan ikke dele med dig selv.");
      return;
    }
    setShareLoading(true);
    setShareError(null);
    try {
      const recipientUserId = await findUserByEmail(email);
      if (!recipientUserId) {
        setShareError("Bruger ikke fundet");
        setShareLoading(false);
        return;
      }
      // Forbid re-sharing to someone already on the list (owner can change role later if needed).
      if (checklist.sharedWith?.[recipientUserId]) {
        setShareError("Listen er allerede delt med denne bruger.");
        setShareLoading(false);
        return;
      }
      await shareChecklist(checklist, recipientUserId, shareRole);
      await refreshChecklist();
      closeShareModal();
    } catch (error) {
      console.error("[handleShareWithUser] error:", error);
      setShareError("Kunne ikke dele listen.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = (recipientUserId: string) => {
    if (!checklist) return;
    Alert.alert(
      "Fjern deling",
      "Er du sikker på, at du vil fjerne denne bruger?",
      [
        { text: "Annuller", style: "cancel" },
        {
          text: "Fjern",
          style: "destructive",
          onPress: async () => {
            try {
              await unshareChecklist(checklist, recipientUserId);
              await refreshChecklist();
            } catch (error) {
              console.error("[handleUnshare] error:", error);
              Alert.alert("Fejl", "Kunne ikke fjerne deling.");
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!checklist || !user?.uid) return;
    Alert.alert(
      "Slet liste",
      `Er du sikker på du vil slette "${checklist.name}"?`,
      [
        { text: "Annuller", style: "cancel" },
        {
          text: "Slet",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteChecklistAndClearCache(checklist, user.uid);
              safeGoBack(router);
            } catch {
              Alert.alert("Fejl", "Kunne ikke slette listen.");
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      await flushPendingOps(user.uid);
      await refreshPendingOps();
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  const openReminderModal = (item: ChecklistItem) => {
    setReminderTargetItem(item);
    setReminderModalVisible(true);
  };

  const existingChecklistItemReminder = reminderTargetItem
    ? reminders.find(
        (r) =>
          r.targetType === "checklistItem" &&
          r.targetId === checklistId &&
          r.targetSubId === reminderTargetItem.id
      ) || null
    : null;

  const handleSaveReminder = async (payload: {
    scheduledAt: number;
    repeat: Reminder["repeat"];
    note?: string;
  }) => {
    if (!user?.uid || !checklistId || !reminderTargetItem || !checklist) return;
    setReminderSaving(true);
    try {
      if (existingChecklistItemReminder) {
        await updateReminder(user.uid, existingChecklistItemReminder.id, payload);
      } else {
        await createReminder({
          userId: user.uid,
          targetType: "checklistItem",
          targetId: checklistId,
          targetProjectId: checklist.projectId,
          targetSubId: reminderTargetItem.id,
          title: reminderTargetItem.title || "Listepunkt",
          ...payload,
        });
      }
      setReminderModalVisible(false);
      setReminderTargetItem(null);
    } catch {
      Alert.alert("Fejl", "Kunne ikke gemme påmindelsen.");
    } finally {
      setReminderSaving(false);
    }
  };

  const handleDeleteReminder = async () => {
    if (!user?.uid || !existingChecklistItemReminder) return;
    setReminderSaving(true);
    try {
      await deleteReminder(user.uid, existingChecklistItemReminder.id);
      setReminderModalVisible(false);
      setReminderTargetItem(null);
    } catch {
      Alert.alert("Fejl", "Kunne ikke slette påmindelsen.");
    } finally {
      setReminderSaving(false);
    }
  };

  const openLocationPicker = (location?: ChecklistLocation) => {
    setEditingLocation(location || null);
    setLocationPickerVisible(true);
  };

  const closeLocationPicker = () => {
    setLocationPickerVisible(false);
    setEditingLocation(null);
  };

  const handleSaveLocation = async (
    payload: Omit<ChecklistLocation, "id" | "createdAt" | "updatedAt">
  ) => {
    if (!checklist || !user?.uid) return;
    try {
      if (editingLocation) {
        await updateChecklistLocation(
          checklist.id,
          editingLocation.id,
          payload,
          checklist.projectId,
          checklist.ownerId
        );
      } else {
        await addChecklistLocation(
          checklist.id,
          payload,
          checklist.projectId,
          checklist.ownerId
        );
      }
      await refreshChecklist();
      closeLocationPicker();
    } catch {
      Alert.alert("Fejl", "Kunne ikke gemme stedet.");
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!checklist) return;
    Alert.alert("Slet sted", "Er du sikker på, at du vil slette dette sted?", [
      { text: "Annuller", style: "cancel" },
      {
        text: "Slet",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteChecklistLocation(
              checklist.id,
              locationId,
              checklist.projectId,
              checklist.ownerId
            );
            await refreshChecklist();
          } catch {
            Alert.alert("Fejl", "Kunne ikke slette stedet.");
          }
        },
      },
    ]);
  };

  const handleToggleLocation = async (locationId: string) => {
    if (!checklist || !user?.uid) return;
    try {
      await toggleChecklistLocationArrival(
        checklist.id,
        locationId,
        checklist.projectId,
        checklist.ownerId
      );
      await refreshChecklist();
    } catch {
      Alert.alert("Fejl", "Kunne ikke ændre indstilling.");
    }
  };

  const openGuide = (location: ChecklistLocation) => {
    setGuideLocation(location);
  };

  const closeGuide = () => {
    setGuideLocation(null);
  };

  const dismissGeofenceBanner = () => {
    setGeofenceBanner(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDark ? "#38bdf8" : "#0284c7"} />
      </View>
    );
  }

  if (!checklist) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Listen blev ikke fundet.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(router)}
        >
          <Text style={styles.backButtonText}>Tilbage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => safeGoBack(router)}>
            <Text style={styles.backText}>← Tilbage</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            {canManageSharing ? (
              <TouchableOpacity
                style={[styles.headerAction, !online && styles.buttonDisabled]}
                onPress={openShareModal}
                disabled={!online}
              >
                <Text style={styles.headerActionText}>Del med</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                styles.headerAction,
                (sharing || !online) && styles.buttonDisabled,
              ]}
              onPress={handleShare}
              disabled={sharing || !online}
            >
              <Text style={styles.headerActionText}>{sharing ? "Deler..." : "Del"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionDanger, !online && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={!online}
            >
              <Text style={styles.headerActionDangerText}>Slet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{checklist.name}</Text>
          {!online ? (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          ) : pendingOps.length > 0 ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Synkroniserer {pendingOps.length}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>
          {items.filter((i) => i.isCompleted).length} af {items.length} udført
          {checklist.syncStatusToSource !== false ? " · status synkroniseres til sagen" : ""}
        </Text>

        {geofenceBanner ? (
          <View style={styles.geofenceBanner}>
            <Text style={styles.geofenceBannerText}>
              {geofenceBanner.event === "departure"
                ? `Du forlader ${geofenceBanner.name}`
                : `Du er tæt på ${geofenceBanner.name}`}
              {openItems.length > 0
                ? ` — ${openItems.length} punkt${openItems.length === 1 ? "" : "er"} venter`
                : " — Alt er klaret 🎉"}
            </Text>
            <TouchableOpacity onPress={dismissGeofenceBanner}>
              <Ionicons name="close-outline" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
            </TouchableOpacity>
          </View>
        ) : null}

        {canManageSharing ? (
          <View style={styles.shareSection}>
            <Text style={styles.shareSectionTitle}>Delt med</Text>
            {Object.keys(checklist.sharedWith || {}).length === 0 ? (
              <Text style={styles.shareSectionHint}>Listen er ikke delt med andre.</Text>
            ) : (
              <View style={styles.recipientList}>
                {Object.entries(checklist.sharedWith || {}).map(([recipientUserId, role]) => (
                  <View key={recipientUserId} style={styles.recipientRow}>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientEmail} numberOfLines={1}>
                        {getSeedUserEmail(recipientUserId) || recipientUserId}
                      </Text>
                      <Text style={styles.recipientRole}>
                        {role === "owner"
                          ? "Ejer"
                          : role === "admin"
                          ? "Administrator"
                          : role === "editor"
                          ? "Redaktør"
                          : "Læser"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeRecipientButton}
                      onPress={() => handleUnshare(recipientUserId)}
                      disabled={!online}
                    >
                      <Text style={styles.removeRecipientText}>Fjern</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {canManageLocations ? (
          <View style={styles.shareSection}>
            <View style={styles.locationSectionHeader}>
              <Text style={styles.shareSectionTitle}>Steder</Text>
              <TouchableOpacity
                style={styles.addLocationButton}
                onPress={() => openLocationPicker()}
                disabled={!online}
              >
                <Text style={styles.addLocationButtonText}>+ Tilføj</Text>
              </TouchableOpacity>
            </View>

            {suggestedPlaces.length > 0 && (checklist.locations || []).length === 0 ? (
              <View style={styles.suggestionRow}>
                {suggestedPlaces.slice(0, 3).map((place) => (
                  <TouchableOpacity
                    key={place.name}
                    style={styles.suggestionChip}
                    onPress={() =>
                      openLocationPicker({
                        id: "suggested",
                        name: place.name,
                        latitude: 0,
                        longitude: 0,
                        radiusMeters: 500,
                        notifyOnArrival: true,
                      })
                    }
                    disabled={!online}
                  >
                    <Text style={styles.suggestionChipText}>{place.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {(checklist.locations || []).length === 0 ? (
              <Text style={styles.shareSectionHint}>
                Ingen steder tilknyttet. Tilføj et sted for at få påmindelser via Shortcuts eller Automate.
              </Text>
            ) : (
              <View style={styles.recipientList}>
                {(checklist.locations || []).map((location) => (
                  <View key={location.id} style={styles.recipientRow}>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientEmail} numberOfLines={1}>
                        {location.name}
                      </Text>
                      <Text style={styles.recipientRole}>
                        {location.radiusMeters >= 1000
                          ? `${location.radiusMeters / 1000} km`
                          : `${location.radiusMeters} m`}
                        {" "}
                        · {location.notifyOnArrival ? "Aktiv" : "Inaktiv"}
                      </Text>
                    </View>
                    <View style={styles.locationActions}>
                      <TouchableOpacity
                        style={styles.locationActionButton}
                        onPress={() => handleToggleLocation(location.id)}
                        disabled={!online}
                      >
                        <Ionicons
                          name={location.notifyOnArrival ? "notifications" : "notifications-off-outline"}
                          size={18}
                          color={isDark ? "#38bdf8" : "#0284c7"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.locationActionButton}
                        onPress={() => openGuide(location)}
                        disabled={!online}
                      >
                        <Ionicons name="share-outline" size={18} color={isDark ? "#38bdf8" : "#0284c7"} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.locationActionButton}
                        onPress={() => openLocationPicker(location)}
                        disabled={!online}
                      >
                        <Ionicons name="create-outline" size={18} color={isDark ? "#38bdf8" : "#0284c7"} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeRecipientButton}
                        onPress={() => handleDeleteLocation(location.id)}
                        disabled={!online}
                      >
                        <Text style={styles.removeRecipientText}>Slet</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {sortedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Ingen punkter</Text>
            <Text style={styles.emptySubtitle}>
              Listen er tom. Opret nye punkter fra søgeresultater.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            renderItem={({ item }) => {
              const itemReminder = reminders.find(
                (r) =>
                  r.targetType === "checklistItem" &&
                  r.targetId === checklistId &&
                  r.targetSubId === item.id
              );
              return (
                <View
                  style={[
                    styles.itemCard,
                    item.isCompleted && styles.completedCard,
                    item.isPending && styles.pendingCard,
                    !online && styles.offlineCard,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleToggleItem(item)}
                    disabled={item.isPending}
                  >
                    <Text style={styles.checkboxText}>
                      {item.isCompleted ? "☑" : "☐"}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.itemContent}>
                    <View style={styles.itemTitleRow}>
                      <Text
                        style={[
                          styles.itemTitle,
                          item.isCompleted && styles.completedText,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <TouchableOpacity
                        style={styles.reminderIcon}
                        onPress={() => openReminderModal(item)}
                        disabled={reminderSaving}
                      >
                        <Ionicons
                          name={itemReminder ? "notifications" : "notifications-outline"}
                          size={18}
                          color={isDark ? "#38bdf8" : "#0284c7"}
                        />
                      </TouchableOpacity>
                    </View>
                    {item.notes ? (
                      <Text
                        style={[
                          styles.itemNotes,
                          item.isCompleted && styles.completedText,
                        ]}
                        numberOfLines={2}
                      >
                        {item.notes}
                      </Text>
                    ) : null}
                    {item.isPending ? (
                      <Text style={styles.pendingLabel}>Afventer synkronisering</Text>
                    ) : null}
                    {item.isStale ? (
                      <Text style={styles.staleLabel}>{item.staleNote || "Sagen findes ikke længere"}</Text>
                    ) : null}
                    <TouchableOpacity
                      onPress={() =>
                        router.push(
                          `/item?itemId=${item.sourceItemId}&projectId=${item.sourceProjectId}` as any
                        )
                      }
                      disabled={!item.sourceProjectId || item.isStale}
                    >
                      <Text style={[styles.sourceLink, item.isStale && styles.staleSourceLink]}>
                        {item.isStale ? "Sag utilgængelig" : "Åbn sag →"}
                      </Text>
                    </TouchableOpacity>
                    {item.isCompleted ? (
                      <Text style={styles.completedMeta}>
                        Udført {formatDate(item.completedAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
      <Modal
        visible={shareModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeShareModal}
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
              <Text style={styles.modalHeader}>Del liste med bruger</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                value={shareEmail}
                onChangeText={(text) => {
                  setShareEmail(text);
                  if (shareError) setShareError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                editable={!shareLoading}
              />
              <Text style={styles.roleLabel}>Rolle</Text>
              <View style={styles.rolePicker}>
                <TouchableOpacity
                  style={[
                    styles.roleChip,
                    shareRole === "editor" && styles.roleChipActive,
                  ]}
                  onPress={() => setShareRole("editor")}
                  disabled={shareLoading}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      shareRole === "editor" && styles.roleChipTextActive,
                    ]}
                  >
                    Redaktør
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleChip,
                    shareRole === "viewer" && styles.roleChipActive,
                  ]}
                  onPress={() => setShareRole("viewer")}
                  disabled={shareLoading}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      shareRole === "viewer" && styles.roleChipTextActive,
                    ]}
                  >
                    Læser
                  </Text>
                </TouchableOpacity>
              </View>
              {shareError ? (
                <Text style={styles.errorText}>{shareError}</Text>
              ) : null}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={closeShareModal}
                  disabled={shareLoading}
                >
                  <Text style={styles.buttonSecondaryText}>Annuller</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonPrimary,
                    (!shareEmail.trim() || shareLoading) && styles.buttonDisabled,
                  ]}
                  onPress={handleShareWithUser}
                  disabled={!shareEmail.trim() || shareLoading}
                >
                  <Text style={styles.buttonPrimaryText}>
                    {shareLoading ? "Deler..." : "Del"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {reminderTargetItem ? (
        <ReminderModal
          key={
            reminderModalVisible
              ? existingChecklistItemReminder?.id || reminderTargetItem.id
              : "closed"
          }
          visible={reminderModalVisible}
          title={reminderTargetItem.title || "Listepunkt"}
          existingReminder={existingChecklistItemReminder}
          saving={reminderSaving}
          onClose={() => {
            setReminderModalVisible(false);
            setReminderTargetItem(null);
          }}
          onSave={handleSaveReminder}
          onDelete={existingChecklistItemReminder ? handleDeleteReminder : undefined}
        />
      ) : null}

      <LocationPicker
        visible={locationPickerVisible}
        existingLocation={editingLocation}
        onClose={closeLocationPicker}
        onSave={handleSaveLocation}
        onDelete={
          editingLocation
            ? () => {
                handleDeleteLocation(editingLocation.id);
                closeLocationPicker();
              }
            : undefined
        }
      />

      {guideLocation && checklist ? (
        <GeoFenceGuide
          visible
          checklistId={checklist.id}
          ownerId={checklist.ownerId}
          location={guideLocation}
          projectId={checklist.projectId}
          onClose={closeGuide}
        />
      ) : null}
    </KeyboardAvoidingView>
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
    backText: {
      color: "#38bdf8",
      fontSize: 16,
      fontWeight: "600",
    },
    headerActions: {
      flexDirection: "row",
      gap: 8,
    },
    headerAction: {
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headerActionText: {
      color: "#0f172a",
      fontWeight: "600",
      fontSize: 13,
    },
    headerActionDanger: {
      backgroundColor: "#f87171",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headerActionDangerText: {
      color: "#0f172a",
      fontWeight: "600",
      fontSize: 13,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 4,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    offlineBadge: {
      backgroundColor: isDark ? "#7c2d12" : "#fef3c7",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    offlineBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: isDark ? "#fdba74" : "#b45309",
    },
    pendingBadge: {
      backgroundColor: isDark ? "#1e3a8a" : "#dbeafe",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    pendingBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: isDark ? "#93c5fd" : "#1d4ed8",
    },
    subtitle: {
      fontSize: 13,
      color: isDark ? "#94a3b8" : "#64748b",
      marginBottom: 16,
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
    itemCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    completedCard: {
      opacity: 0.8,
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
    },
    checkbox: {
      padding: 4,
    },
    checkboxText: {
      fontSize: 22,
      color: "#38bdf8",
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 2,
      lineHeight: 20,
      flex: 1,
    },
    itemTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
    },
    reminderIcon: {
      padding: 4,
    },
    itemNotes: {
      fontSize: 13,
      color: isDark ? "#cbd5e1" : "#475569",
      lineHeight: 18,
      marginBottom: 4,
    },
    pendingCard: {
      borderColor: isDark ? "#0ea5e9" : "#38bdf8",
      borderStyle: "dashed",
    },
    offlineCard: {
      opacity: 0.85,
    },
    pendingLabel: {
      fontSize: 11,
      color: isDark ? "#38bdf8" : "#0284c7",
      marginBottom: 4,
    },
    completedText: {
      textDecorationLine: "line-through",
      color: isDark ? "#94a3b8" : "#64748b",
    },
    sourceLink: {
      fontSize: 12,
      color: "#38bdf8",
      fontWeight: "600",
      marginTop: 2,
    },
    staleSourceLink: {
      color: isDark ? "#94a3b8" : "#64748b",
      fontWeight: "400",
    },
    staleLabel: {
      fontSize: 11,
      color: isDark ? "#f87171" : "#dc2626",
      marginBottom: 4,
    },
    completedMeta: {
      fontSize: 11,
      color: isDark ? "#4ade80" : "#15803d",
      fontWeight: "600",
      marginTop: 4,
    },
    notFound: {
      fontSize: 16,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    backButton: {
      marginTop: 16,
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      alignSelf: "flex-start",
    },
    backButtonText: {
      color: "#0f172a",
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    shareSection: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    shareSectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: 8,
    },
    shareSectionHint: {
      fontSize: 13,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    recipientList: {
      gap: 8,
    },
    recipientRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#334155" : "#e2e8f0",
    },
    recipientInfo: {
      flex: 1,
      minWidth: 120,
      marginRight: 8,
    },
    recipientEmail: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#0f172a",
      lineHeight: 18,
    },
    recipientRole: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: 2,
    },
    removeRecipientButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: isDark ? "#7f1d1d" : "#fee2e2",
    },
    removeRecipientText: {
      color: isDark ? "#fca5a5" : "#ef4444",
      fontWeight: "600",
      fontSize: 12,
    },
    geofenceBanner: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: isDark ? "#14532d" : "#dcfce7",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: isDark ? "#22c55e" : "#86efac",
    },
    geofenceBannerText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#86efac" : "#15803d",
    },
    locationSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    addLocationButton: {
      backgroundColor: "#38bdf8",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    addLocationButtonText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 12,
    },
    suggestionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    suggestionChip: {
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    suggestionChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    locationActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    locationActionButton: {
      padding: 6,
      borderRadius: 6,
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
    roleLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
      marginBottom: 8,
    },
    rolePicker: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    roleChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
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
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    roleChipTextActive: {
      color: "#0f172a",
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
    errorText: {
      color: "#ef4444",
      fontSize: 14,
      marginBottom: 12,
    },
  });
