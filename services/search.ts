// Client-side søgemotor for Data Capture.
// Fase 1: substring-søgning der bevarer specialtegn (&, /, -, tal, æøå).
// Smart-syntaks ("frase", *ord*, -ord, OR, key:value) parses stadig for
// backwards compatibility, men er ikke den primære brugsvej i denne runde.

import { CaptureItem, ItemStatus, ItemType } from "./items";

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  idea: "Idé",
  observation: "Observation",
  bug: "Fejl",
  note: "Notat",
  photo: "Foto",
  voice: "Stemme",
  other: "Andet",
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  new: "Ny",
  in_progress: "I gang",
  done: "Færdig",
  archived: "Arkiveret",
};

export interface SearchTerm {
  value: string;
  exact: boolean;
}

export interface OrTerm extends SearchTerm {
  isPhrase: boolean;
}

export interface SearchQuery {
  required: SearchTerm[]; // hele ord der skal findes (AND)
  phrases: string[]; // præcise sætninger
  excluded: SearchTerm[]; // ord/sætninger der ikke må findes
  orGroups: OrTerm[][]; // grupper af alternativer (OR)
  filters: SearchFilters;
  raw: string;
}

export interface SearchFilters {
  type?: ItemType;
  category?: string;
  status?: ItemStatus;
  assignee?: string; // søger i assignedToName eller e-mail
  projectId?: string;
  hasPhoto?: boolean;
}

export interface HighlightSegment {
  text: string;
  highlight: boolean;
}

type Token =
  | { kind: "phrase"; value: string }
  | { kind: "word"; value: string; exact: boolean }
  | { kind: "exclude"; value: string; exact: boolean }
  | { kind: "or" }
  | { kind: "filter"; key: string; value: string };

const FILTER_ALIASES: Record<string, keyof SearchFilters> = {
  type: "type",
  type_: "type",
  kategori: "category",
  kategori_: "category",
  category: "category",
  status: "status",
  status_: "status",
  ansvarlig: "assignee",
  assignee: "assignee",
  assigned: "assignee",
  projekt: "projectId",
  project: "projectId",
  projectid: "projectId",
  has: "hasPhoto",
};

const ITEM_TYPE_ALIASES: Record<string, ItemType> = {
  idé: "idea",
  ide: "idea",
  idea: "idea",
  observation: "observation",
  bug: "bug",
  fejl: "bug",
  notat: "note",
  note: "note",
  foto: "photo",
  photo: "photo",
  stemme: "voice",
  voice: "voice",
  andet: "other",
  other: "other",
};

const STATUS_ALIASES: Record<string, ItemStatus> = {
  ny: "new",
  new: "new",
  igang: "in_progress",
  "i gang": "in_progress",
  inprogress: "in_progress",
  in_progress: "in_progress",
  færdig: "done",
  ferdig: "done",
  done: "done",
  arkiveret: "archived",
  archived: "archived",
};

/** Tæl antal bogstaver (a-z + æøå, case-insensitive). */
export function hasEnoughSearchLetters(query: string): boolean {
  const letters = query.toLowerCase().match(/[a-zæøåé]/g) || [];
  return letters.length >= 2;
}

function normalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa");
}

function readQuoted(remaining: string, startIndex: number): { value: string; rest: string } {
  let i = startIndex;
  let value = "";
  while (i < remaining.length) {
    const ch = remaining[i];
    if (ch === '"') {
      return { value, rest: remaining.slice(i + 1) };
    }
    value += ch;
    i++;
  }
  // unmatched quote: rest is phrase
  return { value, rest: "" };
}

function readWord(remaining: string): { value: string; rest: string } {
  let i = 0;
  let value = "";
  while (i < remaining.length && remaining[i].trim() !== "") {
    value += remaining[i];
    i++;
  }
  return { value, rest: remaining.slice(i) };
}

function tokenize(raw: string): Token[] {
  const tokens: Token[] = [];
  let remaining = raw.trim();

  while (remaining.length > 0) {
    remaining = remaining.trimStart();
    if (remaining.length === 0) break;

    // Phrase: "..."
    if (remaining.startsWith('"')) {
      const { value, rest } = readQuoted(remaining, 1);
      tokens.push({ kind: "phrase", value });
      remaining = rest;
      continue;
    }

    // Exclude: -word or -"phrase"
    if (remaining.startsWith("-")) {
      if (remaining.startsWith('-"')) {
        const { value, rest } = readQuoted(remaining, 2);
        tokens.push({ kind: "exclude", value, exact: false });
        remaining = rest;
        continue;
      }
      const { value, rest } = readWord(remaining.slice(1));
      const cleaned = value.replace(/^\*+|\*+$/g, "");
      tokens.push({
        kind: "exclude",
        value: cleaned,
        exact: !(value.startsWith("*") || value.endsWith("*")),
      });
      remaining = rest;
      continue;
    }

    // Filter key:value (value runs until whitespace)
    const filterMatch = remaining.match(/^([a-zæøåéA-ZÆØÅÉ0-9_]+):([^\s]+)/i);
    if (filterMatch) {
      tokens.push({
        kind: "filter",
        key: filterMatch[1].toLowerCase(),
        value: filterMatch[2],
      });
      remaining = remaining.slice(filterMatch[0].length);
      continue;
    }

    // OR operator (whole word, case-insensitive)
    if (remaining.length >= 2 && remaining.slice(0, 2).toLowerCase() === "or") {
      const after = remaining[2];
      if (after === undefined || after.trim() === "") {
        tokens.push({ kind: "or" });
        remaining = remaining.slice(3);
        continue;
      }
    }

    // Plain word: read until whitespace. Preserve every char including & / - , . etc.
    const { value, rest } = readWord(remaining);
    const cleaned = value.replace(/^\*+|\*+$/g, "");
    tokens.push({
      kind: "word",
      value: cleaned,
      exact: value.startsWith("*") || value.endsWith("*"),
    });
    remaining = rest;
  }

  return tokens;
}

function resolveType(value: string): ItemType | undefined {
  return ITEM_TYPE_ALIASES[value.toLowerCase()];
}

function resolveStatus(value: string): ItemStatus | undefined {
  return STATUS_ALIASES[value.toLowerCase()];
}

export function parseSearchQuery(raw: string): SearchQuery {
  const tokens = tokenize(raw);
  const query: SearchQuery = {
    required: [],
    phrases: [],
    excluded: [],
    orGroups: [],
    filters: {},
    raw,
  };

  let currentOrGroup: OrTerm[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind === "filter") {
      const filterKey = FILTER_ALIASES[token.key];
      if (!filterKey) continue;
      const value = token.value.toLowerCase();

      if (filterKey === "type") {
        const type = resolveType(value);
        if (type) query.filters.type = type;
      } else if (filterKey === "status") {
        const status = resolveStatus(value);
        if (status) query.filters.status = status;
      } else if (filterKey === "hasPhoto") {
        query.filters.hasPhoto =
          value === "photo" || value === "billede" || value === "foto";
      } else if (filterKey === "category") {
        query.filters.category = token.value;
      } else if (filterKey === "assignee") {
        query.filters.assignee = token.value;
      } else if (filterKey === "projectId") {
        query.filters.projectId = token.value;
      }
      continue;
    }

    if (token.kind === "or") {
      if (currentOrGroup.length > 0) {
        query.orGroups.push(currentOrGroup);
        currentOrGroup = [];
      }
      continue;
    }

    const value = token.value.trim();
    if (!value) continue;

    if (token.kind === "phrase") {
      if (currentOrGroup.length > 0) {
        currentOrGroup.push({ value, exact: false, isPhrase: true });
      } else {
        query.phrases.push(value);
      }
    } else if (token.kind === "exclude") {
      query.excluded.push({ value, exact: token.exact });
    } else if (token.kind === "word") {
      const term: SearchTerm = { value, exact: token.exact };
      if (currentOrGroup.length > 0) {
        currentOrGroup.push({ value, exact: token.exact, isPhrase: false });
      } else {
        query.required.push(term);
      }
    }
  }

  if (currentOrGroup.length > 0) {
    query.orGroups.push(currentOrGroup);
  }

  return query;
}

function getSearchableText(item: CaptureItem): string {
  const parts = [
    item.title,
    item.content,
    item.category,
    ITEM_TYPE_LABELS[item.type],
    STATUS_LABELS[item.status],
    item.assignedToName,
    item.createdByName,
    item.createdByEmail,
    item.assignedTo,
    ...(item.tags || []),
  ];
  return parts.filter((s): s is string => Boolean(s)).join(" ").toLowerCase();
}

function containsTerm(haystack: string, needle: string): boolean {
  const normalizedHaystack = normalizeForMatch(haystack);
  const normalizedNeedle = normalizeForMatch(needle);
  if (!normalizedNeedle) return false;
  return normalizedHaystack.includes(normalizedNeedle);
}

function containsPhrase(haystack: string, phrase: string): boolean {
  return containsTerm(haystack, phrase);
}

function termMatches(
  haystack: string,
  term: { value: string; exact: boolean }
): boolean {
  // Fase 1: substring-baseret matching. exact-flagget parses stadig men
  // påvirker ikke matchingen (whole-word marker *ord* er ude af scope).
  return containsTerm(haystack, term.value);
}

function matchesFilters(item: CaptureItem, filters: SearchFilters): boolean {
  if (filters.type && item.type !== filters.type) return false;
  if (filters.category) {
    const itemCategory = normalizeForMatch(item.category || "");
    if (itemCategory !== normalizeForMatch(filters.category)) return false;
  }
  if (filters.status && item.status !== filters.status) return false;
  if (filters.assignee) {
    const assignee = normalizeForMatch(filters.assignee);
    const name = normalizeForMatch(item.assignedToName || "");
    const userId = normalizeForMatch(item.assignedTo || "");
    if (!name.includes(assignee) && !userId.includes(assignee)) return false;
  }
  if (filters.projectId && item.projectId !== filters.projectId) return false;
  if (filters.hasPhoto === true && !item.mediaUrl) return false;
  if (filters.hasPhoto === false && item.mediaUrl) return false;
  return true;
}

export function matchItem(item: CaptureItem, query: SearchQuery): number {
  if (!matchesFilters(item, query.filters)) return 0;

  const text = getSearchableText(item);
  let score = 0;

  // Required words (AND)
  for (const word of query.required) {
    if (termMatches(text, word)) {
      score += 1;
      if (item.title && containsTerm(item.title, word.value)) score += 1;
    } else {
      return 0;
    }
  }

  // Phrases
  for (const phrase of query.phrases) {
    if (containsPhrase(text, phrase)) {
      score += 3;
      if (item.title && containsPhrase(item.title, phrase)) score += 2;
    } else {
      return 0;
    }
  }

  // OR groups
  for (const group of query.orGroups) {
    const matched = group.some((term) => {
      if (term.isPhrase) return containsPhrase(text, term.value);
      return termMatches(text, term);
    });
    if (!matched) return 0;
    score += 1;
  }

  // Excluded terms
  for (const term of query.excluded) {
    if (termMatches(text, term)) {
      return 0;
    }
  }

  return score;
}

export function searchItems(
  items: CaptureItem[],
  rawQuery: string
): CaptureItem[] {
  if (!rawQuery.trim()) return items;

  const query = parseSearchQuery(rawQuery);

  if (
    query.required.length === 0 &&
    query.phrases.length === 0 &&
    query.orGroups.length === 0 &&
    Object.keys(query.filters).length === 0
  ) {
    return items;
  }

  return items
    .map((item) => ({ item, score: matchItem(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

/** Find highlight-intervaller i text baseret på query-tokens. */
export function findHighlightSegments(
  text: string,
  queryRaw: string
): HighlightSegment[] {
  if (!text || !queryRaw.trim()) {
    return [{ text, highlight: false }];
  }

  const query = parseSearchQuery(queryRaw);
  const searchableText = text.toLowerCase();
  const intervals: { start: number; end: number }[] = [];

  const addInterval = (start: number, end: number) => {
    if (start < 0) start = 0;
    if (end > text.length) end = text.length;
    if (start >= end) return;
    intervals.push({ start, end });
  };

  const findTokenMatches = (token: string) => {
    const needle = normalizeForMatch(token);
    if (!needle) return;
    let index = 0;
    while (index < searchableText.length) {
      const pos = normalizeForMatch(searchableText.slice(index)).indexOf(needle);
      if (pos === -1) break;
      const actualStart = index + pos;
      addInterval(actualStart, actualStart + token.length);
      index = actualStart + Math.max(1, token.length);
    }
  };

  for (const word of query.required) findTokenMatches(word.value);
  for (const phrase of query.phrases) findTokenMatches(phrase);
  for (const group of query.orGroups) {
    for (const term of group) {
      findTokenMatches(term.value);
    }
  }

  // Merge intervals
  intervals.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: { start: number; end: number }[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  // Build segments
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const interval of merged) {
    if (interval.start > cursor) {
      segments.push({ text: text.slice(cursor, interval.start), highlight: false });
    }
    segments.push({ text: text.slice(interval.start, interval.end), highlight: true });
    cursor = interval.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false });
  }
  if (segments.length === 0) {
    segments.push({ text, highlight: false });
  }

  return segments;
}
