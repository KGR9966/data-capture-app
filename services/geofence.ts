import * as Notifications from "expo-notifications";

export interface GeofenceLocation {
  id: string;
  projectId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  itemIds?: string[];
}

export async function scheduleGeofenceNotification(
  location: GeofenceLocation,
  distanceKm: number,
  openItemCount: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Åbne punkter i "${location.name}"`,
      body:
        openItemCount > 0
          ? `Du har ${openItemCount} åbne punkt${openItemCount === 1 ? "" : "er"} i "${location.name}" og er nu ${distanceKm.toFixed(1)} km væk.`
          : `Du nærmer dig "${location.name}" (${distanceKm.toFixed(1)} km væk).`,
      data: {
        type: "geofence",
        locationId: location.id,
        projectId: location.projectId,
      },
    },
    trigger: null,
  });
}
