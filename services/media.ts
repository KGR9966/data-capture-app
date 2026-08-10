import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, putFile, ref } from "@react-native-firebase/storage";

import { storage } from "./firebase";

export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Tilladelse til fotoalbum er nødvendig.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images" as ImagePicker.MediaType],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
}

export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Tilladelse til kamera er nødvendig.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images" as ImagePicker.MediaType],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
}

async function ensureLocalFilePath(
  asset: ImagePicker.ImagePickerAsset
): Promise<string> {
  if (!asset.uri) {
    throw new Error("Billedet har ingen fil-URI.");
  }

  const sourceUri = asset.uri;
  const extension = sourceUri.split("?")[0].split(".").pop() || "jpg";
  const safeExtension = /^[a-zA-Z0-9]+$/.test(extension) ? extension : "jpg";
  const cacheFile = new File(
    Paths.cache,
    `upload_${Date.now()}.${safeExtension}`
  );

  try {
    await new File(sourceUri).copy(cacheFile);
    return cacheFile.uri;
  } catch (copyError) {
    console.warn("[media] Kunne ikke kopiere billede til cache:", copyError);
    if (sourceUri.startsWith("file://")) {
      return sourceUri;
    }
    throw new Error("Billedet kunne ikke forberedes til upload.");
  }
}

export async function uploadImage(
  asset: ImagePicker.ImagePickerAsset,
  path: string
): Promise<string> {
  if (!asset.uri) {
    throw new Error("Billedet har ingen fil-URI.");
  }

  const localUri = await ensureLocalFilePath(asset);
  const localPath = localUri.replace(/^file:\/\//, "");
  const storageRef = ref(storage, path);
  await putFile(storageRef, localPath, { contentType: "image/jpeg" });

  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

export async function pickAndUploadImage(
  folder: string,
  fileName?: string
): Promise<string | null> {
  const asset = await pickImage();
  if (!asset?.uri) return null;

  const name = fileName || `${Date.now()}.jpg`;
  const path = `${folder}/${name}`;
  return uploadImage(asset, path);
}

export async function takeAndUploadPhoto(
  folder: string,
  fileName?: string
): Promise<string | null> {
  const asset = await takePhoto();
  if (!asset?.uri) return null;

  const name = fileName || `${Date.now()}.jpg`;
  const path = `${folder}/${name}`;
  return uploadImage(asset, path);
}
