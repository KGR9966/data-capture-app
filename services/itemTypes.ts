// Pure TypeScript item types used across the app.
// This file contains no native module imports so it can be imported safely by
// test scripts and utility modules.

export type ItemType =
  | "idea"
  | "observation"
  | "bug"
  | "note"
  | "photo"
  | "voice"
  | "other";

export type ItemStatus = "new" | "in_progress" | "done" | "archived";

export const VALID_ITEM_TYPES: ItemType[] = [
  "idea",
  "observation",
  "bug",
  "note",
  "photo",
  "voice",
  "other",
];

export function normalizeItemType(type: string | null | undefined): ItemType {
  if (type === "comment") return "note";
  if (VALID_ITEM_TYPES.includes(type as ItemType)) return type as ItemType;
  return "other";
}
