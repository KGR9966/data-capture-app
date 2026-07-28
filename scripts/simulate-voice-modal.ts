// Simulerer VoiceCaptureModal-opførsel med delvise transkriberinger.
// Bruges til at verificere logikken før nyt EAS build.

import { parseVoiceInput, type VoiceParseResult } from "../services/voiceCommands";

interface State {
  title: string;
  content: string;
  titleFrozen: boolean;
  photoContentBaseline: string;
}

function applyParsedResult(parsed: VoiceParseResult, state: State): State {
  const parsedTitle = parsed.title.trim();
  const parsedContent = parsed.content.trim();
  const frozenTitle = state.title.trim();
  const rawText = parsed.rawText.trim();

  let titleJustFrozen = false;
  let newTitle = state.title;
  let titleFrozen = state.titleFrozen;

  // Titel
  if (parsedTitle && !titleFrozen) {
    newTitle = parsed.title;
    if (parsedContent || /[.!?]\s*$/.test(rawText)) {
      titleFrozen = true;
      titleJustFrozen = true;
    }
  }

  // Content
  let newContent = "";
  if (titleFrozen) {
    if (frozenTitle && rawText.toLowerCase().startsWith(frozenTitle.toLowerCase())) {
      newContent = rawText.slice(frozenTitle.length).replace(/^[.!?]?\s*/, "").trim();
    } else {
      newContent = rawText;
    }
    if (titleJustFrozen && parsedContent) {
      newContent = parsedContent;
    }
  }

  if (state.photoContentBaseline) {
    newContent = newContent
      ? `${state.photoContentBaseline}\n${newContent}`
      : state.photoContentBaseline;
  }

  return {
    title: newTitle,
    content: newContent,
    titleFrozen,
    photoContentBaseline: state.photoContentBaseline,
  };
}

function simulate(label: string, inputs: string[], photoAfterInput?: string) {
  console.log(`\n--- ${label} ---`);
  const state: State = { title: "", content: "", titleFrozen: false, photoContentBaseline: "" };
  for (const input of inputs) {
    const parsed = parseVoiceInput(input);
    Object.assign(state, applyParsedResult(parsed, state));
    if (photoAfterInput && input === photoAfterInput) {
      state.photoContentBaseline = state.content;
      console.log(`  [FOTO] baseline content = "${state.content}"`);
    }
    console.log(`  "${input}"`);
    console.log(`      title: "${state.title}" | content: "${state.content.replace(/\n/g, "\\n")}"`);
  }
  console.log(`\n  FINAL title: "${state.title}"`);
  console.log(`  FINAL content: "${state.content.replace(/\n/g, "\\n")}"`);
}

// Brugeres tidligere fungerende eksempel med rettelser undervejs.
simulate("Silvan. Spade. Åbn kamera + gem", [
  "Silvan",
  "Silvan punktum",
  "Silvan punktum spade",
  "Silvan punktum spade punktum",
  "Silvan punktum spade punktum åbn kamera",
], "Silvan punktum spade punktum åbn kamera");

// Efter foto: ny optagelse starter, brugeren siger "maling komma hammer".
simulate("Efter foto: maling komma hammer", [
  "maling",
  "maling komma",
  "maling komma hammer",
  "maling komma hammer punktum",
]);

// Sammensat: hele flowet med foto og efterfølgende tekst.
simulate("Komplet flow med foto", [
  "Silvan punktum spade punktum åbn kamera",
  "maling komma hammer",
  "maling komma hammer punktum gem",
]);

// Brugeres eksempel med duplikering.
simulate("Silvan maling komma spade (delvise transkriberinger)", [
  "Silvan",
  "Silvan punktum",
  "Silvan punktum maling",
  "Silvan punktum maling komma",
  "Silvan punktum maling komma spade",
  "Silvan punktum maling komma spande",
  "Silvan punktum maling komma spand",
]);
