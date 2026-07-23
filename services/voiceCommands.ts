// Stemmekommando-processor.
// Omdanner talemæssige kommandoer til tegn og handlinger i realtid.

export interface VoiceCommandResult {
  text: string;
  shouldStop: boolean; // optagelse bør stoppes ("gem"/"opret")
  shouldCancel: boolean; // optagelse bør annulleres ("annuller")
  shouldClear: boolean; // ryd alt ("slet alt")
  shouldUndo: boolean; // fjern sidste ord/sætning ("fortryd")
}

const PUNCTUATION_COMMANDS: Record<string, string> = {
  punktum: ".",
  punkt: ".",
  comma: ",",
  komma: ",",
  semikolon: ";",
  semicolon: ";",
  kolon: ":",
  colon: ":",
  spørgsmålstegn: "?",
  spørgsmål: "?",
  questionmark: "?",
  udråbstegn: "!",
  udråb: "!",
  exclamationmark: "!",
  tankestreg: "-",
  dash: "-",
  bindestreg: "-",
  new_line: "\n",
  ny_linje: "\n",
  nylinje: "\n",
  skift: "\n",
  linjeskift: "\n",
  line_break: "\n",
};

const STOP_COMMANDS = new Set([
  "gem",
  "save",
  "opret",
  "create",
  "færdig",
  "ferdig",
  "done",
]);

const CANCEL_COMMANDS = new Set(["annuller", "abort", "cancel", "luk"]);
const CLEAR_COMMANDS = new Set(["ryd", "clear", "slet alt"]);
const UNDO_COMMANDS = new Set(["fortryd", "undo"]);
const DELETE_LAST_WORD_COMMANDS = new Set([
  "slet sidste ord",
  "fjern sidste ord",
  "slet ord",
  "fjern ord",
  "delete last word",
]);

function normalizeCommand(str: string): string {
  return str
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9_\s]/g, "")
    .trim();
}

function endsWithCommand(text: string, command: string): boolean {
  const normalizedText = normalizeCommand(text);
  const normalizedCommand = normalizeCommand(command);
  return (
    normalizedText === normalizedCommand ||
    normalizedText.endsWith(" " + normalizedCommand)
  );
}

function removeLastCommand(text: string, command: string): string {
  const normalizedCommand = normalizeCommand(command);
  const normalizedText = normalizeCommand(text);
  if (normalizedText === normalizedCommand) return "";
  if (normalizedText.endsWith(" " + normalizedCommand)) {
    const prefix = normalizedText.slice(
      0,
      normalizedText.length - normalizedCommand.length - 1
    );
    return prefix;
  }
  return text;
}

function removeLastWord(text: string): string {
  const trimmed = text.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return "";
  return trimmed.slice(0, lastSpace).trim();
}

function applyPunctuationSpacing(text: string): string {
  return (
    text
      // sikr mellemrum efter tegnsætning
      .replace(/([.!?:;,])([^\s\n])/g, "$1 $2")
      // fjern mellemrum før tegnsætning
      .replace(/\s+([.!?:;,])/g, "$1")
      // fjern dobbeltmellemrum
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

function processCommandTokens(input: string): string {
  let text = input;

  // Slet sidste ord
  for (const command of DELETE_LAST_WORD_COMMANDS) {
    if (endsWithCommand(text, command)) {
      text = removeLastCommand(text, command);
      text = removeLastWord(text);
      return applyPunctuationSpacing(text);
    }
  }

  // Tegnsætning og linjeskift
  for (const [command, replacement] of Object.entries(PUNCTUATION_COMMANDS)) {
    const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(^|\\s)${escaped}(?=\\s|$)`,
      "gi"
    );
    text = text.replace(pattern, (match, prefix) => `${prefix}${replacement}`);
  }

  return applyPunctuationSpacing(text);
}

export function processVoiceCommands(input: string): VoiceCommandResult {
  const result: VoiceCommandResult = {
    text: input,
    shouldStop: false,
    shouldCancel: false,
    shouldClear: false,
    shouldUndo: false,
  };

  const normalizedInput = normalizeCommand(input);
  const words = normalizedInput.split(/\s+/).filter(Boolean);
  const lastWords = words.slice(-3).join(" ");
  const lastTwoWords = words.slice(-2).join(" ");
  const lastWord = words[words.length - 1] || "";

  if (CANCEL_COMMANDS.has(lastWord) || CANCEL_COMMANDS.has(lastTwoWords)) {
    result.shouldCancel = true;
    result.text = "";
    return result;
  }

  if (CLEAR_COMMANDS.has(lastWord) || CLEAR_COMMANDS.has(lastTwoWords)) {
    result.shouldClear = true;
    result.text = "";
    return result;
  }

  if (UNDO_COMMANDS.has(lastWord) || UNDO_COMMANDS.has(lastTwoWords)) {
    result.shouldUndo = true;
    result.text = "";
    return result;
  }

  if (STOP_COMMANDS.has(lastWord) || STOP_COMMANDS.has(lastTwoWords)) {
    result.shouldStop = true;
    result.text = processCommandTokens(input);
    return result;
  }

  result.text = processCommandTokens(input);
  return result;
}

export function postProcessTranscription(text: string): string {
  return applyPunctuationSpacing(text);
}
