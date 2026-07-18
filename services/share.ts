import * as Clipboard from "expo-clipboard";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import Share from "react-native-share";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getCacheFileName(remoteUrl: string): string {
  let base = "image";
  let ext = ".jpg";
  try {
    const url = new URL(remoteUrl);
    const segment = url.pathname.split("/").pop();
    if (segment) {
      const decoded = decodeURIComponent(segment);
      const lastDot = decoded.lastIndexOf(".");
      if (lastDot > 0) {
        base = decoded.slice(0, lastDot);
        ext = decoded.slice(lastDot);
      } else {
        base = decoded;
      }
    }
  } catch {
    // Fallback to a generic name if the URL cannot be parsed.
  }
  return `${sanitizeFileName(base)}-${Date.now()}${sanitizeFileName(ext)}`;
}

export async function cacheRemoteImage(remoteUrl: string): Promise<string> {
  const cacheDir = Paths.cache;
  const fileName = getCacheFileName(remoteUrl);
  const destination = new File(cacheDir, fileName);
  const downloadedFile = await File.downloadFileAsync(remoteUrl, destination, {
    idempotent: true,
  });
  return downloadedFile.uri;
}

export async function copyImageToClipboard(remoteUrl: string): Promise<void> {
  const localUri = await cacheRemoteImage(remoteUrl);
  const cachedFile = new File(localUri);
  try {
    const base64 = await cachedFile.base64();
    await Clipboard.setImageAsync(base64);
  } finally {
    await cleanupCachedImage(localUri);
  }
}

export async function shareImage(
  remoteUrl: string,
  title?: string,
  message?: string
): Promise<void> {
  const localUri = await cacheRemoteImage(remoteUrl);
  const cachedFile = new File(localUri);
  try {
    const shareUrl =
      Platform.OS === "android" ? cachedFile.contentUri : cachedFile.uri;
    await Share.open({
      url: shareUrl,
      type: "image/*",
      title,
      message,
      failOnCancel: false,
    });
  } finally {
    await cleanupCachedImage(localUri);
  }
}

export async function shareText(
  text: string,
  title?: string,
  subject?: string
): Promise<void> {
  await Share.open({
    message: text,
    title,
    subject,
    failOnCancel: false,
  });
}

export async function cleanupCachedImage(localUri: string): Promise<void> {
  try {
    const cachedFile = new File(localUri);
    await cachedFile.delete();
  } catch (error) {
    console.log("[ShareService] cleanupCachedImage error:", error);
  }
}
