// Stemmekommando-parser for Data Capture.
// Omdanner talemæssige kommandoer til tegn og handlinger efter PO-godkendt
// overskrift-punktum-model (US-004 redesign, juli 2026).

import type { ItemType } from "./itemTypes";

export interface VoiceParseResult {
  title: string; // første sætning / overskrift
  content: string; // resten, med linjeskift
  type: ItemType; // ud fra nøgleord
  category: string; // dansk label for type
  command:
    | "save"
    | "cancel"
    | "clear"
    | "undo"
    | "openAlbum"
    | "openCamera"
    | null;
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
const OPEN_ALBUM_COMMANDS = ["aaben album", "aabn album", "vaelg foto", "album"];
const OPEN_CAMERA_COMMANDS = [
  "aaben kamera",
  "aabn kamera",
  "tag billede",
  "kamera",
];

const PHOTO_PREFIXES = ["aabne", "aaben", "aabn", "vaelg", "tag", "et"];

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
  return str
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[Æ]/g, "ae")
    .replace(/[Ø]/g, "oe")
    .replace(/[Å]/g, "aa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

  // Foto-kommandoer må forekomme hvor som helst i sætningen, ikke kun til sidst.
  for (const cmd of OPEN_ALBUM_COMMANDS) {
    if (normalized.includes(cmd)) return "openAlbum";
  }
  for (const cmd of OPEN_CAMERA_COMMANDS) {
    if (normalized.includes(cmd)) return "openCamera";
  }

  for (const cmd of STOP_COMMANDS) {
    if (lastOne === cmd || lastTwo === cmd) return "save";
  }
  return null;
}

/** Fjerner foto-kommandoen og evt. foranstående aktionsord (åbn/åben/åbne/tag/vælg/et).
 *  Beholder resten af den originale tekst, så den kan renses af cleanText senere. */
function stripPhotoCommand(input: string, command: "openAlbum" | "openCamera"): string {
  const normalized = normalizeCommand(input);
  const commands = command === "openAlbum" ? OPEN_ALBUM_COMMANDS : OPEN_CAMERA_COMMANDS;

  let matchedPhrase = "";
  let matchedIndex = -1;
  for (const cmd of commands) {
    const idx = normalized.indexOf(cmd);
    if (idx !== -1 && (matchedIndex === -1 || idx < matchedIndex)) {
      matchedIndex = idx;
      matchedPhrase = cmd;
    }
  }
  if (!matchedPhrase) return input;

  const beforeText = normalized.slice(0, matchedIndex).trim();
  const beforeWords = beforeText.split(/\s+/).filter(Boolean);
  while (beforeWords.length > 0 && PHOTO_PREFIXES.includes(beforeWords[beforeWords.length - 1])) {
    beforeWords.pop();
  }

  const afterText = normalized.slice(matchedIndex + matchedPhrase.length).trim();
  const afterWords = afterText.split(/\s+/).filter(Boolean);

  return [...beforeWords, ...afterWords].join(" ");
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
    openAlbum: OPEN_ALBUM_COMMANDS,
    openCamera: OPEN_CAMERA_COMMANDS,
  };

  // For foto-kommandoer fjernes hele forekomsten fra teksten, ikke kun sidste token.
  // Fjernelsen sker via ordbounds-tælling på normaliseret tekst, så accenter og
  // store/små bogstaver i det originale input ignoreres.
  if (command === "openAlbum" || command === "openCamera") {
    return stripPhotoCommand(input, command);
  }

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

/** Kollaps gentagne identiske tegnsætningskommandoer til én forekomst. */
function collapseRepeatedPunctuationCommands(input: string): string {
  const allPunctuationCommands = Object.keys(PUNCTUATION_COMMANDS).sort(
    (a, b) => b.length - a.length
  );
  let text = input;
  for (const cmd of allPunctuationCommands) {
    const escaped = escapeRegex(cmd);
    const regex = new RegExp(`\\b${escaped}\\b(?:\\s+\\b${escaped}\\b)+`, "gi");
    text = text.replace(regex, cmd);
  }
  return text;
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
  // Normaliser mellemrum omkring linjeskift, så "punktum ny linje punktum"
  // bliver én linje adskilt af ét tegn, ikke to tomme linjer.
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
  // Maksimalt ét blankt afsnit.
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

function applyPunctuationSpacing(text: string): string {
  return (
    text
      // Flyt tegnsætning der står først på en ny linje tilbage til forrige linje.
      .replace(/\n\s*([.!?:;,])/g, "$1\n")
      // Fjern mellemrum i starten af en ny linje.
      .replace(/\n +/g, "\n")
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
  text = collapseRepeatedPunctuationCommands(text);
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

/** Deler tekst op i punkter baseret på både linjeskift OG sætningsafslutninger.
 *  Bruges når brugeren dikterer flere punkter uden eksplicitte pauser. */
function splitIntoPoints(text: string): string[] {
  const points: string[] = [];
  // Del først på linjeskift, derefter på sætningsafslutning indenfor hver linje.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    let remaining = line;
    while (remaining.length > 0) {
      const m = /[.!?]/.exec(remaining);
      if (!m) {
        points.push(remaining.trim());
        break;
      }
      const end = m.index + 1;
      const candidate = remaining.slice(0, end).trim();
      if (candidate) points.push(candidate);
      remaining = remaining.slice(end).trim();
    }
  }
  return points.filter(Boolean);
}

/**
 * Check whether a word is a standalone type keyword (e.g. "bug", "idé", "notat").
 * Phrase keywords like "virker ikke" are not considered standalone prefixes.
 */
function getStandaloneTypeKeyword(word: string): ItemType | null {
  const normalizedWord = normalizeCommand(word);
  if (!normalizedWord) return null;

  for (const { type, terms, match } of TYPE_KEYWORDS) {
    if (match === "phrase") continue;
    for (const term of terms) {
      const normalizedTerm = normalizeCommand(term);
      if (!normalizedTerm) continue;
      if (match === "full" && normalizedWord === normalizedTerm) return type;
      if (match === "prefix" && normalizedWord.startsWith(normalizedTerm)) return type;
      if (match === "suffix" && normalizedWord.endsWith(normalizedTerm)) return type;
    }
  }
  return null;
}

/**
 * Remove an explicit category keyword that stands alone at the very beginning of
 * the text, followed by a sentence terminator or paragraph break. This prevents
 * the keyword itself from becoming the title (e.g. "Bug. Knappen virker ikke."
 * should produce title "Knappen virker ikke", not "Bug").
 *
 * Preserves the rest of the text unchanged so title/content splitting works on the
 * cleaned version without the prefix.
 */
function stripLeadingTypeKeyword(cleaned: string): string {
  const trimmed = cleaned.trim();
  if (!trimmed) return trimmed;

  // Grab the first token, including any trailing punctuation (e.g. "Bug.").
  const firstTokenMatch = /^([^\s.!?]+[.!?]?)(\s+|$)/.exec(trimmed);
  if (!firstTokenMatch) return trimmed;

  const firstToken = firstTokenMatch[1];
  const afterToken = trimmed.slice(firstTokenMatch[0].length);

  // The keyword must be recognized and it must be separated from the rest by a
  // sentence terminator (either inside the token or immediately after whitespace),
  // or by a paragraph break. This avoids stripping "Bug" from "Bug i login knappen".
  const keywordType = getStandaloneTypeKeyword(firstToken);
  if (!keywordType) return trimmed;

  const tokenEndsWithTerminator = /[.!?]$/.test(firstToken);
  const afterStartsWithTerminator = /^\s*[.!?]/.test(afterToken);
  const afterStartsWithParagraph = /^\n\n/.test(afterToken);
  if (!tokenEndsWithTerminator && !afterStartsWithTerminator && !afterStartsWithParagraph) {
    return trimmed;
  }

  // Also leave content that is just the keyword alone (e.g. user only said "Bug.").
  if (!afterToken.trim()) return trimmed;

  // Preserve the terminator that was inside the token so the rest can be split
  // into title/content normally. "Bug. Knappen..." becomes "Knappen...".
  if (tokenEndsWithTerminator) {
    return afterToken.trim();
  }

  // "Bug Knappen..." becomes ". Knappen..." so splitTitleContent still sees the
  // terminator and can split cleanly.
  return trimmed.slice(firstTokenMatch[1].length).trim();
}

function splitTitleContent(cleaned: string): { title: string; content: string } {
  const trimmed = cleaned.trim();
  if (!trimmed) return { title: "", content: "" };

  // Find første sætningsafslutning eller afsnitsskift (nyt afsnit).
  const firstTerminator = /[.!?]/.exec(trimmed);
  const paragraphBreak = trimmed.indexOf("\n\n");

  const splitAtTerminator =
    firstTerminator &&
    (paragraphBreak === -1 || firstTerminator.index + 1 <= paragraphBreak);

  if (splitAtTerminator) {
    const splitIndex = firstTerminator.index + 1;
    const title = removeTrailingPunctuation(trimmed.slice(0, splitIndex)).trim();
    let content = trimmed.slice(splitIndex).trim();

    if (content) {
      content = splitIntoSentences(content);
    }

    return { title, content };
  }

  if (paragraphBreak > 0) {
    return {
      title: trimmed.slice(0, paragraphBreak).trim(),
      content: splitIntoSentences(trimmed.slice(paragraphBreak + 2).trim()),
    };
  }

  // Regel V1/V2: én sammenhængende tekst uden tegnsætning/pause.
  // Brug første linje som titel og resten som content, så flere dikterede
  // punkter adskilt af linjeskift eller pause stadig bliver individuelle punkter.
  const singleLineBreak = trimmed.indexOf("\n");
  if (singleLineBreak > 0) {
    const title = trimmed.slice(0, singleLineBreak).trim();
    const content = splitIntoPoints(trimmed.slice(singleLineBreak + 1).trim()).join("\n");
    return { title, content };
  }
  return { title: trimmed, content: "" };
}

/** Hovedparser: omdanner rå stemmeinput til struktureret resultat. */
export function parseVoiceInput(input: string): VoiceParseResult {
  const splitInput = splitGluedCommands(input);
  const command = detectCommand(splitInput);
  const textAfterCommands = command ? removeCommandWords(splitInput, command) : splitInput;
  const rawText = cleanText(textAfterCommands);

  // Infer type on the full text first, then strip a leading category keyword so it
  // does not become the title when the user explicitly prefixes with "Bug." etc.
  const type = inferType(rawText, "");
  const strippedRawText = stripLeadingTypeKeyword(rawText);
  const { title, content } = splitTitleContent(strippedRawText);
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

/**
 * Del et ord op, hvis en kendt kommando er klistret sammen med det
 * (f.eks. "oliepunktum" → ["olie", "punktum"] eller "husgem" → ["hus", "gem"]).
 * Splitter kun kommandoer der sidder i enden af ordet, så danske ord som
 * "gemmer" ikke ødelægges.
 */
function splitWordAtCommand(word: string, command: string): string[] | null {
  const normalizedWord = normalizeCommand(word);
  const normalizedCommand = normalizeCommand(command);
  if (!normalizedCommand || normalizedCommand.length < 2) return null;
  if (normalizedWord.length <= normalizedCommand.length) return null;

  const index = normalizedWord.indexOf(normalizedCommand);
  if (index === -1) return null;

  // Kun del kommandoer der sidder i slutningen af ordet.
  if (index + normalizedCommand.length !== normalizedWord.length) return null;

  // Map normaliseret indeks tilbage til originalt tegn-indeks.
  let originalIndex = 0;
  let normalizedIndex = 0;
  for (const char of word) {
    if (normalizedIndex >= index) break;
    normalizedIndex += normalizeCommand(char).length;
    originalIndex += char.length;
  }

  let originalCommandEnd = originalIndex;
  let normalizedCount = 0;
  for (const char of word.slice(originalIndex)) {
    if (normalizedCount >= normalizedCommand.length) break;
    normalizedCount += normalizeCommand(char).length;
    originalCommandEnd += char.length;
  }

  const before = word.slice(0, originalIndex);
  const after = word.slice(originalCommandEnd);
  const parts: string[] = [];
  if (before.trim()) parts.push(before);
  parts.push(command);
  if (after.trim()) parts.push(after);
  return parts.length > 1 ? parts : null;
}

/**
 * Gennemløb hele inputtet og split klistrede kommandoer, så de behandles
 * korrekt af parseren.
 */
function splitGluedCommands(input: string): string {
  const commands = Array.from(
    new Set([
      ...Object.keys(PUNCTUATION_COMMANDS),
      ...STOP_COMMANDS,
      ...CANCEL_COMMANDS,
      ...CLEAR_COMMANDS,
      ...UNDO_COMMANDS,
    ])
  ).sort((a, b) => b.length - a.length);

  const words = input.trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];
  for (const word of words) {
    let split: string[] | null = null;
    for (const cmd of commands) {
      split = splitWordAtCommand(word, cmd);
      if (split) break;
    }
    result.push(...(split || [word]));
  }
  return result.join(" ");
}

/** Hjælpefunktion til fortryd: fjerner sidste ord fra en streng. */
export function removeLastWord(text: string): string {
  const trimmed = text.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return "";
  return trimmed.slice(0, lastSpace).trim();
}
