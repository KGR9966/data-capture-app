// Stemmekommando-parser for Data Capture.
// Omdanner talemæssige kommandoer til tegn og handlinger efter PO-godkendt
// overskrift-punktum-model (US-004 redesign, juli 2026).

import type { ItemType } from "./items";

export interface VoiceParseResult {
  title: string; // første sætning / overskrift
  content: string; // resten, med linjeskift
  type: ItemType; // ud fra nøgleord
  category: string; // dansk label for type
  command: "save" | "cancel" | "clear" | "undo" | null;
  rawText: string; // rensede transcript efter kommando-fjernelse
}

export type VoiceCommand = VoiceParseResult["command"];

// Legacy-resultat, beholdes så eksisterende forbrugere ikke knækker.
export interface VoiceCommandResult {
  text: string;
  shouldStop: boolean;
  shouldCancel: boolean;
  shouldClear: boolean;
  shouldUndo: boolean;
}

const TYPE_CATEGORY_LABELS: Record<ItemType, string> = {
  idea: "Idé",
  observation: "Observation",
  bug: "Fejl",
  note: "Notat",
  photo: "Foto",
  voice: "Stemme",
  other: "Andet",
};

// Prioriteret rækkefølge: bug → idea → observation → note → other.
const TYPE_KEYWORDS: { type: ItemType; terms: string[]; match: "full" | "prefix" | "suffix" | "phrase" }[] = [
  {
    type: "bug",
    terms: ["fejl", "bug", "crash", "fejler", "virker ikke"],
    match: "prefix",
  },
  { type: "bug", terms: ["virker ikke"], match: "phrase" },
  {
    type: "idea",
    terms: ["idé", "ide", "idea"],
    match: "full",
  },
  {
    type: "idea",
    terms: ["forbedring", "ønske", "feature", "forslag"],
    match: "prefix",
  },
  {
    type: "observation",
    terms: ["observation", "observer", "observeret", "bemærk", "bemærkning"],
    match: "prefix",
  },
  { type: "note", terms: ["notat", "kommentar"], match: "prefix" },
  { type: "note", terms: ["note", "spørgsmål"], match: "suffix" },
];

const STOP_COMMANDS = ["gem", "save", "opret", "færdig", "ferdig", "done"];
const CLEAR_COMMANDS = ["slet alt"];
const UNDO_COMMANDS = ["fortryd", "undo"];
const CANCEL_COMMANDS = ["annuller", "abort", "cancel", "luk"];

const PUNCTUATION_COMMANDS: Record<string, string> = {
  punktum: ".",
  punkt: ".",
  komma: ",",
  comma: ",",
  semikolon: ";",
  semicolon: ";",
  kolon: ":",
  colon: ":",
  "spørgsmålstegn": "?",
  "udråbstegn": "!",
  questionmark: "?",
  exclamationmark: "!",
  udråb: "!",
  tankestreg: "-",
  bindestreg: "-",
  dash: "-",
  "ny linje": "\n",
  nylinje: "\n",
  linjeskift: "\n",
  linebreak: "\n",
  "new line": "\n",
  newline: "\n",
  skift: "\n",
  "nyt afsnit": "\n\n",
};

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Normaliser til små bogstaver uden accenter og med æøå → ae/oe/aa.
 *  Beholder mellemrum så sætningsnøgleord som "virker ikke" bevares. */
export function normalizeCommand(str: string): string {
  return stripDiacritics(str)
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9_\s]/g, "")
    .trim();
}

function getWords(str: string): string[] {
  return str.trim().split(/\s+/).filter(Boolean);
}

function removeTrailingPunctuation(str: string): string {
  return str.replace(/[.!?]+\s*$/, "").trim();
}

function detectCommand(input: string): VoiceCommand {
  const normalized = normalizeCommand(input);
  const words = getWords(normalized);
  const lastOne = words[words.length - 1] || "";
  const lastTwo = words.slice(-2).join(" ");

  for (const cmd of CANCEL_COMMANDS) {
    if (lastOne === cmd || lastTwo === cmd) return "cancel";
  }
  for (const cmd of CLEAR_COMMANDS) {
    if (lastOne === cmd || lastTwo === cmd) return "clear";
  }
  for (const cmd of UNDO_COMMANDS) {
    if (lastOne === cmd || lastTwo === cmd) return "undo";
  }
  for (const cmd of STOP_COMMANDS) {
    if (lastOne === cmd || lastTwo === cmd) return "save";
  }
  return null;
}

/** Fjerner de sidste N tokens svarende til den genkendte kommando.
 *  Fjerner også evt. efterfølgende tegnsætning, men bevarer resten. */
function removeCommandWords(input: string, command: VoiceCommand): string {
  if (!command) return input;

  const normalized = normalizeCommand(input);
  const words = getWords(normalized);
  const lastOne = words[words.length - 1] || "";
  const lastTwo = words.slice(-2).join(" ");

  const lists: Record<Exclude<VoiceCommand, null>, string[]> = {
    save: STOP_COMMANDS,
    cancel: CANCEL_COMMANDS,
    clear: CLEAR_COMMANDS,
    undo: UNDO_COMMANDS,
  };

  let matchedPhrase = "";
  for (const cmd of lists[command]) {
    if (lastOne === cmd) {
      matchedPhrase = cmd;
      break;
    }
    if (lastTwo === cmd) {
      matchedPhrase = cmd;
      break;
    }
  }

  if (!matchedPhrase) return input;

  const phraseWordCount = matchedPhrase.split(/\s+/).length;
  const originalWords = input.trim().split(/\s+/);
  if (originalWords.length < phraseWordCount) return "";

  return originalWords.slice(0, -phraseWordCount).join(" ").trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Konverterer talemæssige tegnsætningskommandoer til tegn.
 *  Matcher hele ord, inklusiv ved siden af tegnsætning. Duplikerede
 *  kommandoer normaliseres til ét tegn. */
function convertPunctuationCommands(input: string): string {
  let text = ` ${input} `;
  const entries = Object.entries(PUNCTUATION_COMMANDS).sort(
    (a, b) => b[0].length - a[0].length
  );

  const boundary = `(?:^|\\s|[^a-zA-Z0-9æøåÆØÅéÉüÜäÄöÖ])`;

  for (const [command, replacement] of entries) {
    const escaped = escapeRegex(command);
    const regex = new RegExp(
      `(${boundary})${escaped}(${boundary})`,
      "gi"
    );
    text = text.replace(regex, (_match, before: string, after: string) => {
      return `${before || ""}${replacement}${after || ""}`;
    });
  }

  // Normaliser duplikerede tegnsætningskommandoer til ét tegn.
  text = text.replace(/([.!?,;:\-])\1+/g, "$1");
  // Maksimalt ét blankt afsnit.
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

function applyPunctuationSpacing(text: string): string {
  return (
    text
      // Sikr mellemrum efter tegnsætning (men ikke før linjeskift).
      .replace(/([.!?:;,])([^\s\n])/g, "$1 $2")
      // Fjern mellemrum før tegnsætning.
      .replace(/\s+([.!?:;,])/g, "$1")
      // Fjern dobbeltmellemrum.
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

function cleanText(input: string): string {
  let text = input;
  text = convertPunctuationCommands(text);
  text = applyPunctuationSpacing(text);
  return text;
}

function inferType(text: string, title: string): ItemType {
  const normalizedTitle = normalizeCommand(title);
  const normalizedText = normalizeCommand(text);
  const haystackTitle = getWords(normalizedTitle);
  const haystackText = getWords(normalizedText);

  const matches = (
    term: string,
    match: "full" | "prefix" | "suffix" | "phrase",
    words: string[],
    stringHaystack: string
  ): boolean => {
    const normalizedTerm = normalizeCommand(term);
    if (!normalizedTerm) return false;

    if (match === "phrase") {
      return stringHaystack.includes(normalizedTerm);
    }

    for (const word of words) {
      if (match === "full" && word === normalizedTerm) return true;
      if (match === "prefix" && word.startsWith(normalizedTerm)) return true;
      if (match === "suffix" && word.endsWith(normalizedTerm)) return true;
    }
    return false;
  };

  // Tjek overskrift først, derefter hele teksten (V3).
  for (const source of [
    { words: haystackTitle, string: normalizedTitle },
    { words: haystackText, string: normalizedText },
  ]) {
    for (const { type, terms, match } of TYPE_KEYWORDS) {
      for (const term of terms) {
        if (matches(term, match, source.words, source.string)) {
          return type;
        }
      }
    }
  }

  return "other";
}

/** Del teksten i titel (første sætning) og indhold (resten).
 *  Hver ny sætning i indholdet bliver en ny linje. */
function firstWordIsTypeKeyword(word: string): boolean {
  const normalizedWord = normalizeCommand(word);
  if (!normalizedWord) return false;

  for (const { terms, match } of TYPE_KEYWORDS) {
    if (match === "phrase") continue;
    for (const term of terms) {
      const normalizedTerm = normalizeCommand(term);
      if (!normalizedTerm) continue;
      if (match === "full" && normalizedWord === normalizedTerm) return true;
      if (match === "prefix" && normalizedWord.startsWith(normalizedTerm)) return true;
      if (match === "suffix" && normalizedWord.endsWith(normalizedTerm)) return true;
    }
  }
  return false;
}

function splitIntoSentences(text: string): string {
  const sentences: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    const m = /[.!?]/.exec(remaining);
    if (!m) {
      sentences.push(remaining.trim());
      break;
    }
    const end = m.index + 1;
    sentences.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  return sentences.filter(Boolean).join("\n");
}

function splitTitleContent(cleaned: string): { title: string; content: string } {
  const trimmed = cleaned.trim();
  if (!trimmed) return { title: "", content: "" };

  // Hvis første ord er et type-nøgleord, betragtes det som overskrift, og
  // resten som indhold – også uden eksplicit punktum (E3, E4, "Fejl ...").
  const firstWord = trimmed.split(/\s+/)[0] || "";
  if (firstWordIsTypeKeyword(firstWord)) {
    const title = removeTrailingPunctuation(firstWord).trim();
    let content = trimmed.slice(firstWord.length).trim().replace(/^[.!?:;,]\s*/, "").trim();
    if (content) {
      content = splitIntoSentences(content);
    }
    return { title, content };
  }

  // Find første sætningsafslutning.
  const firstTerminator = /[.!?]/.exec(trimmed);
  if (firstTerminator) {
    const splitIndex = firstTerminator.index + 1;
    const title = removeTrailingPunctuation(trimmed.slice(0, splitIndex)).trim();
    let content = trimmed.slice(splitIndex).trim();

    if (content) {
      content = splitIntoSentences(content);
    }

    return { title, content };
  }

  // Fallback: første linjeskift eller første 8 ord.
  const lineBreak = trimmed.indexOf("\n");
  if (lineBreak > 0) {
    return {
      title: trimmed.slice(0, lineBreak).trim(),
      content: trimmed.slice(lineBreak + 1).trim(),
    };
  }

  const words = trimmed.split(/\s+/);
  if (words.length > 8) {
    return {
      title: words.slice(0, 8).join(" "),
      content: words.slice(8).join(" "),
    };
  }

  return { title: trimmed, content: "" };
}

/** Hovedparser: omdanner rå stemmeinput til struktureret resultat. */
export function parseVoiceInput(input: string): VoiceParseResult {
  const command = detectCommand(input);
  const textAfterCommands = command ? removeCommandWords(input, command) : input;
  const rawText = cleanText(textAfterCommands);
  const { title, content } = splitTitleContent(rawText);
  const type = inferType(rawText, title);
  const category = TYPE_CATEGORY_LABELS[type];

  return {
    title,
    content,
    type,
    category,
    command,
    rawText,
  };
}

/** Legacy-wrapper omkring den nye parser. */
export function processVoiceCommands(input: string): VoiceCommandResult {
  const parsed = parseVoiceInput(input);
  return {
    text: parsed.rawText,
    shouldStop: parsed.command === "save",
    shouldCancel: parsed.command === "cancel",
    shouldClear: parsed.command === "clear",
    shouldUndo: parsed.command === "undo",
  };
}

export function postProcessTranscription(text: string): string {
  return applyPunctuationSpacing(text);
}

/** Hjælpefunktion til fortryd: fjerner sidste ord fra en streng. */
export function removeLastWord(text: string): string {
  const trimmed = text.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return "";
  return trimmed.slice(0, lastSpace).trim();
}
