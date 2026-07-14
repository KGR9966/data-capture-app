import { initializeApp } from "firebase/app";
import {
  enableNetwork,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  throw new Error(
    `Firebase konfiguration mangler: ${missingKeys.join(", ")}. Kopier .env.example til .env og udfyld værdierne.`
  );
}

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

enableNetwork(db).catch((error) => {
  console.log("Firestore enable network error", error);
});

export const storage = getStorage(app);

export default app;
