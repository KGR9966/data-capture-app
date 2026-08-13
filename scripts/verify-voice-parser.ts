import { parseVoiceInput } from "../services/voiceCommands";

const cases = [
  {
    id: "E1",
    input: "Observationsnote fra byggepladsen punktum vinduet er sprunget komma glasskår overalt punktum gem",
    expected: { title: "Observationsnote fra byggepladsen", content: "vinduet er sprunget, glasskår overalt.", type: "observation", command: "save" },
  },
  {
    id: "E2",
    input: "Fejl login knappen virker ikke punktum nyt afsnit Jeg har prøvet både iOS og Android punktum gem",
    expected: { title: "Fejl login knappen virker ikke", content: "Jeg har prøvet både iOS og Android.", type: "bug", command: "save" },
  },
  {
    id: "E3",
    input: "Idé til forbedring af sagsøversigten nyt afsnit filtre i toppen komma sortering efter dato punktum gem",
    expected: { title: "Idé til forbedring af sagsøversigten", content: "filtre i toppen, sortering efter dato.", type: "idea", command: "save" },
  },
  {
    id: "E4",
    input: "Notat fra kundemødet punktum aftalt pris 5000 kr komma deadline næste uge punktum gem",
    expected: { title: "Notat fra kundemødet", content: "aftalt pris 5000 kr, deadline næste uge.", type: "note", command: "save" },
  },
  {
    id: "E5",
    input: "Husk at bestille fliser til terrassen punktum gem",
    expected: { title: "Husk at bestille fliser til terrassen", content: "", type: "other", command: "save" },
  },
  {
    id: "E6",
    input: "Tag billede af skaden på taget",
    expected: { title: "af skaden på taget", content: "", type: "other", command: "openCamera" },
  },
  {
    id: "E7",
    input: "Vælg foto fra album til dokumentation",
    expected: { title: "fra album til dokumentation", content: "", type: "other", command: "openAlbum" },
  },
  {
    id: "E8",
    input: "punktum punktum punktum",
    expected: { title: "", content: "", type: "other", command: null },
  },
  {
    id: "E9",
    input: "Åbn album",
    expected: { title: "", content: "", type: "other", command: "openAlbum" },
  },
  {
    id: "E10",
    input: "Åbn kamera",
    expected: { title: "", content: "", type: "other", command: "openCamera" },
  },
  {
    id: "E11",
    input: "Observationsnote fra byggepladsen",
    expected: { title: "Observationsnote fra byggepladsen", content: "", type: "observation", command: null },
  },
  {
    id: "E12",
    input: "Silvan punktum hammer ny linje komma sav punktum gem",
    expected: { title: "Silvan", content: "hammer,\nsav.", type: "other", command: "save" },
  },
  {
    id: "E13",
    input: "Billede punktum smukt husgem",
    expected: { title: "Billede", content: "smukt hus", type: "other", command: "save" },
  },
  {
    id: "D1.1",
    input: "Åbn kamera",
    expected: { title: "", content: "", type: "other", command: "openCamera" },
  },
  {
    id: "D1.2",
    input: "Åben kamera",
    expected: { title: "", content: "", type: "other", command: "openCamera" },
  },
  {
    id: "D1.3",
    input: "Åbne kamera",
    expected: { title: "", content: "", type: "other", command: "openCamera" },
  },
  {
    id: "D1.4",
    input: "Åbn album vinduet er sprunget",
    expected: { title: "vinduet er sprunget", content: "", type: "other", command: "openAlbum" },
  },
  {
    id: "D1.5",
    input: "Tag billede af skaden på taget",
    expected: { title: "af skaden på taget", content: "", type: "other", command: "openCamera" },
  },
  {
    id: "D1.6",
    input: "Vælg foto fra dokumentation",
    expected: { title: "fra dokumentation", content: "", type: "other", command: "openAlbum" },
  },
  {
    id: "D1.7",
    input: "Observationsnote åbn kamera skaden på taget",
    expected: { title: "Observationsnote skaden på taget", content: "", type: "observation", command: "openCamera" },
  },
  {
    id: "D1.8",
    input: "Silvan punktum åbn kamera",
    expected: { title: "Silvan", content: "", type: "other", command: "openCamera" },
  },
  // Regression cases for P2: explicit category prefix must not become the title.
  {
    id: "P2-1",
    input: "Bug. Knappen virker ikke.",
    expected: { title: "Knappen virker ikke", content: "", type: "bug", command: null },
  },
  {
    id: "P2-2",
    input: "Bug punktum knappen virker ikke punktum",
    expected: { title: "knappen virker ikke", content: "", type: "bug", command: null },
  },
  {
    id: "P2-3",
    input: "Idé. Vi skal have mørkt tema som standard.",
    expected: { title: "Vi skal have mørkt tema som standard", content: "", type: "idea", command: null },
  },
  {
    id: "P2-4",
    input: "Notat. Ændring af farve på knappen",
    expected: { title: "Ændring af farve på knappen", content: "", type: "note", command: null },
  },
  // TC-008: æøå must be preserved after photo commands and in ordinary input.
  {
    id: "TC008-1",
    input: "Indkøb",
    expected: { title: "Indkøb", content: "", type: "other", command: null },
  },
  {
    id: "TC008-2",
    input: "Tag billede af skaden på taget",
    expected: { title: "af skaden på taget", content: "", type: "other", command: "openCamera" },
  },
  {
    id: "TC008-3",
    input: "Åbn album vinduet er sprunget",
    expected: { title: "vinduet er sprunget", content: "", type: "other", command: "openAlbum" },
  },
  {
    id: "TC008-4",
    input: "Vælg foto fra dokumentation",
    expected: { title: "fra dokumentation", content: "", type: "other", command: "openAlbum" },
  },
  {
    id: "TC008-5",
    input: "Observationsnote åbn kamera skaden på taget",
    expected: { title: "Observationsnote skaden på taget", content: "", type: "observation", command: "openCamera" },
  },
  {
    id: "TC008-6",
    input: "Tag billede af møbler til stuen",
    expected: { title: "af møbler til stuen", content: "", type: "other", command: "openCamera" },
  },
  {
    id: "TC008-7",
    input: "Åbn kamera Ændring af farve på knappen",
    expected: { title: "Ændring af farve på knappen", content: "", type: "other", command: "openCamera" },
  },
];

let failures = 0;

for (const c of cases) {
  const result = parseVoiceInput(c.input);
  const ok =
    result.title === c.expected.title &&
    result.content === c.expected.content &&
    result.type === c.expected.type &&
    result.command === c.expected.command;
  if (!ok) {
    failures++;
    console.log(`\n❌ ${c.id} FAILED`);
    console.log("Input:   ", c.input);
    console.log("Expected:", c.expected);
    console.log("Actual:  ", {
      title: result.title,
      content: result.content,
      type: result.type,
      command: result.command,
      rawText: result.rawText,
    });
  } else {
    console.log(`✅ ${c.id}`);
  }
}

console.log(`\n${failures === 0 ? "✅ All passed" : `❌ ${failures} failed`}`);
process.exit(failures > 0 ? 1 : 0);
