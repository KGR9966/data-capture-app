import { getApp } from "@react-native-firebase/app";
import { getFirestore } from "@react-native-firebase/firestore";
import { getStorage } from "@react-native-firebase/storage";

export const db = getFirestore(getApp());
export const storage = getStorage();

export { getApp };
