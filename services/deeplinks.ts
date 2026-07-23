export const APP_SCHEME = "datacapture";

export function buildBoardUrl(
  params: { category?: string; status?: string } = {}
): string {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.status) query.set("status", params.status);
  const queryString = query.toString();
  return `${APP_SCHEME}://tabs/board${queryString ? `?${queryString}` : ""}`;
}

export function buildItemUrl(itemId: string): string {
  return `${APP_SCHEME}://item?itemId=${encodeURIComponent(itemId)}`;
}

export function buildChecklistUrl(checklistId: string): string {
  return `${APP_SCHEME}://checklist?id=${encodeURIComponent(checklistId)}`;
}

export function buildOpenListUrl(checklistId: string): string {
  return `${APP_SCHEME}://open-list?id=${encodeURIComponent(checklistId)}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Clipboard = require("expo-clipboard");
  await Clipboard.setStringAsync(text);
}
