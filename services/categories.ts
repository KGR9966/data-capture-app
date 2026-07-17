import { CaptureItem } from "./items";

export const SUGGESTED_CATEGORIES = [
  "UI/UX",
  "Feature",
  "Bug",
  "Performance",
  "Security",
  "Copywriting",
  "Accessibility",
  "Testing",
  "Architecture",
  "Process",
  "Idea",
  "Question",
  "Other",
];

export function suggestCategory(item: Partial<CaptureItem>): string {
  const text = `${item.title || ""} ${item.content || ""}`.toLowerCase();

  if (/bug|fejl|crash|fejler|virker ikke/.test(text)) return "Fejl";
  if (/langsom|hænger|performance|snedig/.test(text)) return "Ydelse";
  if (/sikker|login|adgang|beskyttelse/.test(text)) return "Sikkerhed";
  if (/ui|design|layout|knap|farve|skrif/.test(text)) return "UI/UX";
  if (/tekst|overskrift|besked|copy/.test(text)) return "Tekst";
  if (/adgang|handicap|læsevenlig/.test(text)) return "Tilgængelighed";
  if (/test|verificer|automatiser/.test(text)) return "Test";
  if (/arkitektur|struktur|refactor/.test(text)) return "Arkitektur";
  if (/proces|workflow|rutine/.test(text)) return "Proces";
  if (/idé|ide|forbedring|ønske/.test(text)) return "Idé";
  if (/spørgsmål|hvordan|hvorfor/.test(text)) return "Spørgsmål";

  return item.type === "bug"
    ? "Fejl"
    : item.type === "observation"
    ? "Test"
    : item.type === "idea"
    ? "Idé"
    : item.type === "note"
    ? "Notat"
    : "Andet";
}
