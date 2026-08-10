/**
 * Minimal test of M4 search parser fix: "og"/"and" should not become required words.
 */

import { parseSearchQuery } from "../services/search";

const cases = [
  {
    input: "Silvan og Jem og Fix",
    expectedRequired: ["silvan", "jem", "fix"],
    expectedPhrases: [] as string[],
  },
  {
    input: "Silvan and Jem and Fix",
    expectedRequired: ["silvan", "jem", "fix"],
    expectedPhrases: [] as string[],
  },
  {
    input: '"Silvan og Jem" og Fix',
    expectedRequired: ["fix"],
    expectedPhrases: ["Silvan og Jem"],
  },
];

let failures = 0;
for (const c of cases) {
  const result = parseSearchQuery(c.input);
  const requiredValues = result.required.map((r) => r.value.toLowerCase());
  const phraseValues = result.phrases.map((p) => p);

  if (JSON.stringify(requiredValues) !== JSON.stringify(c.expectedRequired)) {
    console.error(
      `FAIL ${c.input}: required=${JSON.stringify(requiredValues)} expected=${JSON.stringify(
        c.expectedRequired
      )}`
    );
    failures++;
  } else if (JSON.stringify(phraseValues) !== JSON.stringify(c.expectedPhrases)) {
    console.error(
      `FAIL ${c.input}: phrases=${JSON.stringify(phraseValues)} expected=${JSON.stringify(
        c.expectedPhrases
      )}`
    );
    failures++;
  } else {
    console.log(`PASS ${c.input}`);
  }
}

if (failures > 0) {
  process.exit(1);
}
console.log("✅ All search parser tests passed.");
