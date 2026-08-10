#!/usr/bin/env node
/**
 * P2/P3 voice dictation reproduction script.
 *
 * Runs reported problematic inputs through parseVoiceInput and documents
 * actual vs expected output. Used to decide whether a fix is safe for Build 2.
 *
 * P2 = type keyword becoming title (e.g. "Bug. ..." producing title "Bug").
 * P3-1 = Danish characters shown as ae/oe/aa (not reproduced in parser).
 * P3-2 = line break command "ny linje" lost after title/content split.
 */

const { parseVoiceInput } = require("../services/voiceCommands");

const cases = [
  {
    id: "P2-1",
    input: "Bug. Knappen virker ikke.",
    reported: "Kategori vises som Idé i stedet for Bug / Fejl",
    expectedType: "bug",
    expectedTitle: "Knappen virker ikke",
    expectedContent: "",
  },
  {
    id: "P2-2",
    input: "Bug knappen virker ikke punktum",
    reported: "Type-nøgleord blandes sammen med titel/indhold",
    expectedType: "bug",
    expectedTitleNot: "Bug",
  },
  {
    id: "P2-3",
    input: "Idé. Vi skal have mørkt tema som standard.",
    reported: "Kategori Idé men titel bliver også Idé",
    expectedType: "idea",
    expectedTitle: "Vi skal have mørkt tema som standard",
    expectedContent: "",
  },
  {
    id: "P2-4",
    input: "Notat. Ændring af farve på knappen",
    reported: "Kategori Notat men titel bliver også Notat",
    expectedType: "note",
    expectedTitle: "Ændring af farve på knappen",
    expectedContent: "",
  },
  {
    id: "P3-1",
    input: "Notat punktum Ændring af farve på knappen",
    reported: "Æ vises som ae i output",
    expectedType: "note",
    expectedTitleIncludes: "Æ",
    note: "Parser preserves Æ; if output shows 'ae' the issue is upstream (speech recognizer or UI).",
  },
  {
    id: "P3-2",
    input: "Observation. Brugeren kan ikke finde søgefeltet. ny linje Det står ikke tydeligt nok.",
    reported: "Linjeskift mangler / titel og indhold blandes",
    expectedType: "observation",
    expectedTitle: "Brugeren kan ikke finde søgefeltet",
    expectedContent: "Det står ikke tydeligt nok.",
    note: "Explicit 'ny linje' after a sentence currently gets normalised into plain content. Separate UX decision.",
  },
];

let failures = 0;

for (const c of cases) {
  const result = parseVoiceInput(c.input);
  const issues = [];

  if (c.expectedType && result.type !== c.expectedType) {
    issues.push(`type expected ${c.expectedType}, got ${result.type}`);
  }
  if (c.expectedTitle !== undefined && result.title !== c.expectedTitle) {
    issues.push(`title expected '${c.expectedTitle}', got '${result.title}'`);
  }
  if (c.expectedTitleNot && result.title === c.expectedTitleNot) {
    issues.push(`title should not be '${c.expectedTitleNot}', got '${result.title}'`);
  }
  if (c.expectedTitleIncludes && !result.title.includes(c.expectedTitleIncludes)) {
    issues.push(`title expected to include '${c.expectedTitleIncludes}', got '${result.title}'`);
  }
  if (c.expectedContent !== undefined && result.content !== c.expectedContent) {
    issues.push(`content expected '${c.expectedContent}', got '${result.content}'`);
  }

  if (issues.length > 0) {
    failures++;
    console.log(`\n❌ ${c.id} FAILED - ${c.reported}`);
    console.log("Input:   ", c.input);
    console.log("Issues:  ", issues.join("; "));
    console.log("Result:  ", {
      title: result.title,
      content: result.content,
      type: result.type,
      category: result.category,
      command: result.command,
      rawText: result.rawText,
    });
  } else {
    console.log(`✅ ${c.id} - ${c.reported}`);
  }
}

console.log(`\n${failures === 0 ? "✅ All reported cases passed" : `❌ ${failures} reported cases reproduced`}`);
process.exit(failures > 0 ? 1 : 0);
