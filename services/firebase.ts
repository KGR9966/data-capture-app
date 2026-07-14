import { firebase, getApp } from "@react-native-firebase/app";

let firestoreModule: typeof import("@react-native-firebase/firestore") | null = null;
let storageModule: typeof import("@react-native-firebase/storage") | null = null;

function getFirestoreModule() {
  if (!firestoreModule) {
    firestoreModule = require("@react-native-firebase/firestore");
  }
  return firestoreModule;
}

function getStorageModule() {
  if (!storageModule) {
    storageModule = require("@react-native-firebase/storage");
  }
  return storageModule;
}

const firestoreMod = getFirestoreModule();
const storageMod = getStorageModule();

if (!firestoreMod || !storageMod) {
  throw new Error("Firebase native modules kunne ikke indlæses.");
}

export const db = firestoreMod.getFirestore(getApp());
export const storage = storageMod.getStorage();

export default firebase;
