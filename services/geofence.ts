import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";

import { APP_SCHEME } from "./deeplinks";
import { ChecklistLocation } from "./checklists";

export interface GeofenceLocation {
  id: string;
  projectId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  itemIds?: string[];
}

export interface GeofenceEvent {
  type: "arrival" | "departure";
  locationId: string;
  checklistId: string;
  projectId?: string;
  ownerId: string;
}

const DEFAULT_EVENT = "arrival";

export function buildGeofenceUrl(
  checklistId: string,
  ownerId: string,
  location: ChecklistLocation,
  projectId?: string,
  event: "arrival" | "departure" = DEFAULT_EVENT
): string {
  const params = new URLSearchParams();
  params.set("id", checklistId);
  params.set("userId", ownerId);
  params.set("locationId", location.id);
  params.set("geofence", "true");
  params.set("event", event);
  if (projectId) params.set("projectId", projectId);

  return `${APP_SCHEME}://checklist?${params.toString()}`;
}

export function buildOpenAutomationAppUrl(platform: "ios" | "android"): string {
  if (platform === "ios") {
    return "shortcuts://create-shortcut";
  }
  return "https://play.google.com/store/apps/details?id=com.llamalab.automate";
}

export function parseGeofenceEvent(url: string): GeofenceEvent | null {
  const parsed = Linking.parse(url);
  if (parsed.scheme !== APP_SCHEME) return null;
  if (parsed.hostname !== "checklist" && !parsed.path?.includes("checklist")) return null;

  const params = parsed.queryParams || {};
  if (params.geofence !== "true") return null;

  const event = params.event === "departure" ? "departure" : "arrival";
  const locationId = Array.isArray(params.locationId) ? params.locationId[0] : params.locationId;
  const checklistId = Array.isArray(params.id) ? params.id[0] : params.id;
  const ownerId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  if (!locationId || !checklistId || !ownerId) return null;

  return {
    type: event,
    locationId,
    checklistId,
    projectId: Array.isArray(params.projectId) ? params.projectId[0] : params.projectId,
    ownerId,
  };
}

export async function scheduleGeofenceNotification(
  locationName: string,
  openItemCount: number,
  event: "arrival" | "departure" = "arrival"
): Promise<void> {
  const title =
    event === "departure"
      ? `Du forlader ${locationName}`
      : `Du er tæt på ${locationName}`;

  const body =
    openItemCount > 0
      ? `Du har ${openItemCount} åbne punkt${openItemCount === 1 ? "" : "er"} i listen.`
      : "Alt i listen er klaret 🎉";

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: "geofence", locationName, event },
    },
    trigger: null,
  });
}

export interface SuggestedPlace {
  name: string;
  category: string;
}

const PLACE_SUGGESTIONS: Record<string, SuggestedPlace[]> = {
  it: [
    { name: "Elgiganten", category: "IT og elektronik" },
    { name: "Power", category: "IT og elektronik" },
    { name: "Proshop", category: "IT og elektronik" },
    { name: "ComputerSalg", category: "IT og elektronik" },
  ],
  computer: [
    { name: "Elgiganten", category: "IT og elektronik" },
    { name: "Power", category: "IT og elektronik" },
    { name: "Proshop", category: "IT og elektronik" },
  ],
  elektronik: [
    { name: "Elgiganten", category: "IT og elektronik" },
    { name: "Power", category: "IT og elektronik" },
  ],
  mobil: [
    { name: "Elgiganten", category: "Mobil og telefoni" },
    { name: "Power", category: "Mobil og telefoni" },
    { name: "3", category: "Mobil og telefoni" },
  ],
  post: [
    { name: "PostNord", category: "Post og pakker" },
    { name: "Posthuset", category: "Post og pakker" },
  ],
  pakke: [
    { name: "PostNord", category: "Post og pakker" },
    { name: "DAO", category: "Post og pakker" },
    { name: "GLS", category: "Post og pakker" },
  ],
  renseri: [
    { name: "Renseriet", category: "Renseri" },
  ],
  skjorte: [
    { name: "Renseriet", category: "Renseri" },
  ],
  have: [
    { name: "Plantorama", category: "Havecenter" },
    { name: "Bauhaus", category: "Byggemarked" },
    { name: "Silvan", category: "Byggemarked" },
  ],
  plante: [
    { name: "Plantorama", category: "Havecenter" },
    { name: "Bauhaus", category: "Byggemarked" },
  ],
  byggeri: [
    { name: "Silvan", category: "Byggemarked" },
    { name: "Stark", category: "Byggemarked" },
    { name: "XL-Byg", category: "Byggemarked" },
    { name: "Bauhaus", category: "Byggemarked" },
  ],
  træ: [
    { name: "Silvan", category: "Byggemarked" },
    { name: "Stark", category: "Byggemarked" },
    { name: "XL-Byg", category: "Byggemarked" },
  ],
  maling: [
    { name: "Flügger", category: "Maling" },
    { name: "Sadolin", category: "Maling" },
    { name: "Bauhaus", category: "Byggemarked" },
  ],
  mad: [
    { name: "Føtex", category: "Supermarked" },
    { name: "Netto", category: "Discount" },
    { name: "Rema 1000", category: "Discount" },
    { name: "Lidl", category: "Discount" },
  ],
  indkøb: [
    { name: "Føtex", category: "Supermarked" },
    { name: "Rema 1000", category: "Discount" },
    { name: "Netto", category: "Discount" },
  ],
  medicin: [
    { name: "Apoteket", category: "Apotek" },
  ],
  apotek: [
    { name: "Apoteket", category: "Apotek" },
  ],
  dyre: [
    { name: "Dyrecenter", category: "Dyrehandel" },
    { name: "Fætter BR", category: "Legetøj" },
  ],
  legetøj: [
    { name: "Fætter BR", category: "Legetøj" },
    { name: "Søstrene Grene", category: "Bolig" },
  ],
  bil: [
    { name: "Shell", category: "Benzin" },
    { name: "Circle K", category: "Benzin" },
    { name: "OK", category: "Benzin" },
    { name: "Biltema", category: "Biludstyr" },
  ],
  benzin: [
    { name: "Shell", category: "Benzin" },
    { name: "Circle K", category: "Benzin" },
    { name: "OK", category: "Benzin" },
  ],
  bank: [
    { name: "Danske Bank", category: "Bank" },
    { name: "Nordea", category: "Bank" },
    { name: "Jyske Bank", category: "Bank" },
  ],
  kontor: [
    { name: "Søstrene Grene", category: "Bolig" },
    { name: "Bilka", category: "Stormagasin" },
  ],
  møbler: [
    { name: "IKEA", category: "Møbler" },
    { name: "Ilva", category: "Møbler" },
    { name: "Søstrene Grene", category: "Bolig" },
  ],
  tøj: [
    { name: "H&M", category: "Tøj" },
    { name: "Zara", category: "Tøj" },
    { name: "Magasin", category: "Stormagasin" },
  ],
  sko: [
    { name: "Deichmann", category: "Sko" },
    { name: "Birkenstock", category: "Sko" },
  ],
  værktøj: [
    { name: "Silvan", category: "Byggemarked" },
    { name: "Stark", category: "Byggemarked" },
    { name: "Biltema", category: "Biludstyr" },
  ],
  møde: [
    { name: "Danske Bank", category: "Bank" },
    { name: "Nordea", category: "Bank" },
  ],
};

function normalizeKeyword(value: string): string {
  return value
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function suggestPlacesForChecklist(
  checklistName: string,
  itemTitles: string[] = []
): SuggestedPlace[] {
  const text = normalizeKeyword(`${checklistName} ${itemTitles.join(" ")}`);
  const words = text.split(/\s+/).filter(Boolean);

  const seen = new Set<string>();
  const results: SuggestedPlace[] = [];

  for (const word of words) {
    const suggestions = PLACE_SUGGESTIONS[word];
    if (!suggestions) continue;
    for (const place of suggestions) {
      if (seen.has(place.name)) continue;
      seen.add(place.name);
      results.push(place);
    }
  }

  // Fallback: if no keyword matched, suggest a few generic useful places
  // so the user always sees the feature in action.
  if (results.length === 0) {
    const fallbacks: SuggestedPlace[] = [
      { name: "Føtex", category: "Supermarked" },
      { name: "Rema 1000", category: "Discount" },
      { name: "Silvan", category: "Byggemarked" },
    ];
    for (const place of fallbacks) {
      if (!seen.has(place.name)) {
        seen.add(place.name);
        results.push(place);
      }
    }
  }

  return results;
}

export function geofenceGuideText(
  platform: "ios" | "android",
  locationName: string,
  arrivalUrl: string,
  departureUrl?: string
): string {
  const lines: string[] = [];

  if (platform === "ios") {
    lines.push(`Få besked, når du er tæt på ${locationName}`);
    lines.push("");
    lines.push("1. Åbn Shortcuts-appen.");
    lines.push('2. Tryk "Automation" → "+" → "Arrives".');
    lines.push(`3. Vælg "${locationName}" på kortet og indstil radius.`);
    lines.push('4. Tilføj handlingen "Open URL" og indsæt:');
    lines.push(arrivalUrl);
    lines.push('5. Slå "Ask Before Running" fra.');
    lines.push("6. Gem.");

    if (departureUrl) {
      lines.push("");
      lines.push("For afgang, gentag med linket:");
      lines.push(departureUrl);
    }
  } else {
    lines.push(`Få besked, når du er tæt på ${locationName}`);
    lines.push("");
    lines.push("1. Åbn Automate (eller Tasker).");
    lines.push("2. Opret en flow med trigger \"Location enter\".");
    lines.push(`3. Indstil koordinater for ${locationName} og radius.`);
    lines.push("4. Tilføj handling \"Browse URL\" og indsæt:");
    lines.push(arrivalUrl);
    lines.push("5. Gem.");

    if (departureUrl) {
      lines.push("");
      lines.push("For afgang, gentag med linket:");
      lines.push(departureUrl);
    }
  }

  return lines.join("\n");
}
