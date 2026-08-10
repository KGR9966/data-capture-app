import { getApp } from "@react-native-firebase/app";
import {
  clearPersistence,
  enableNetwork,
  getFirestore,
  setLogLevel,
} from "@react-native-firebase/firestore";
import { getFunctions } from "@react-native-firebase/functions";
import { getStorage } from "@react-native-firebase/storage";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";

const app = getApp();
export const db = getFirestore(app);
export const storage = getStorage();
export const functions = getFunctions(app, "us-central1");

console.log(
  "[firebase] initialized — db:",
  !!db,
  "functions:",
  !!functions,
  "storage:",
  !!storage
);

let isNetworkEnabled = false;

async function enableFirestoreNetwork(): Promise<void> {
  try {
    await enableNetwork(db);
    isNetworkEnabled = true;
    console.log("[firebase] Firestore network enabled");
  } catch (err) {
    isNetworkEnabled = false;
    console.warn("[firebase] enableNetwork failed:", err);
  }
}

// Attempt to enable the network immediately on startup.
enableFirestoreNetwork();

// Re-enable network when the app returns to the foreground. Firestore can stay
// offline after extended backgrounding or connection drops, and this gives it a
// deterministic nudge to come back online.
let appState = AppState.currentState;
AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
  if (
    appState.match(/inactive|background/) != null &&
    nextAppState === "active"
  ) {
    console.log("[firebase] app returned to foreground — re-enabling network");
    enableFirestoreNetwork();
  }
  appState = nextAppState;
});

// Track device connectivity for diagnostics and for write-gating in the UI.
let lastNetInfo: NetInfoState | null = null;
let isConnected = true;

NetInfo.addEventListener((state: NetInfoState) => {
  lastNetInfo = state;
  isConnected = state.isConnected ?? false;
  console.log(
    "[firebase] network state changed — connected:",
    isConnected,
    "type:",
    state.type,
    "isInternetReachable:",
    state.isInternetReachable
  );
  if (isConnected && !isNetworkEnabled) {
    enableFirestoreNetwork();
  }
});

export function isDeviceOnline(): boolean {
  return isConnected;
}

/**
 * Returns a promise that resolves when the device appears to be online, or
 * rejects after the given timeout. Use before critical server-only operations.
 */
export async function waitForNetwork(
  timeoutMs = 5000,
  label = "operation"
): Promise<void> {
  const state = await NetInfo.fetch();
  if (state.isConnected) {
    return;
  }
  return new Promise((resolve, reject) => {
    let resolved = false;
    const unsub = NetInfo.addEventListener((s: NetInfoState) => {
      if (!resolved && s.isConnected) {
        resolved = true;
        unsub();
        resolve();
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsub();
        reject(
          new Error(
            `Ingen netværksforbindelse. ${label} kræver internet. Prøv igen når du er online.`
          )
        );
      }
    }, timeoutMs);
  });
}

/**
 * Clear Firestore offline persistence. Use as a last resort when the local
 * cache is out of sync with the server (e.g. ghost projects visible in the app
 * but not in the Firebase Console). The app must be restarted afterwards.
 */
export async function clearFirestorePersistenceCache(): Promise<void> {
  try {
    await clearPersistence(db);
    console.log("[firebase] Firestore persistence cleared");
  } catch (error) {
    console.warn("[firebase] Failed to clear Firestore persistence:", error);
    throw error;
  }
}

if (__DEV__) {
  setLogLevel("debug");
}

export { getApp };
