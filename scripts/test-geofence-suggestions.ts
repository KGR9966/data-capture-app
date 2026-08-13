// Standalone test of the place suggestion algorithm to avoid pulling in
// React Native Firebase dependencies from services/geofence.ts.

interface SuggestedPlace {
  name: string;
  category: string;
}

const PLACE_SUGGESTIONS: Record<string, SuggestedPlace[]> = {
  it: [
    { name: "Elgiganten", category: "IT og elektronik" },
    { name: "Power", category: "IT og elektronik" },
    { name: "Proshop", category: "IT og elektronik" },
    { name: "ComputerSalg", category: "IT og elektronik" },
  ],
  computer: [
    { name: "Elgiganten", category: "IT og elektronik" },
    { name: "Power", category: "IT og elektronik" },
    { name: "Proshop", category: "IT og elektronik" },
  ],
  elektronik: [
    { name: "Elgiganten", category: "IT og elektronik" },
    { name: "Power", category: "IT og elektronik" },
  ],
  mobil: [
    { name: "Elgiganten", category: "Mobil og telefoni" },
    { name: "Power", category: "Mobil og telefoni" },
    { name: "3", category: "Mobil og telefoni" },
  ],
  post: [
    { name: "PostNord", category: "Post og pakker" },
    { name: "Posthuset", category: "Post og pakker" },
  ],
  pakke: [
    { name: "PostNord", category: "Post og pakker" },
    { name: "DAO", category: "Post og pakker" },
    { name: "GLS", category: "Post og pakker" },
  ],
  renseri: [
    { name: "Renseriet", category: "Renseri" },
  ],
  skjorte: [
    { name: "Renseriet", category: "Renseri" },
  ],
  have: [
    { name: "Plantorama", category: "Havecenter" },
    { name: "Bauhaus", category: "Byggemarked" },
    { name: "Silvan", category: "Byggemarked" },
  ],
  plante: [
    { name: "Plantorama", category: "Havecenter" },
    { name: "Bauhaus", category: "Byggemarked" },
  ],
  byggeri: [
    { name: "Silvan", category: "Byggemarked" },
    { name: "Stark", category: "Byggemarked" },
    { name: "XL-Byg", category: "Byggemarked" },
    { name: "Bauhaus", category: "Byggemarked" },
  ],
  træ: [
    { name: "Silvan", category: "Byggemarked" },
    { name: "Stark", category: "Byggemarked" },
    { name: "XL-Byg", category: "Byggemarked" },
  ],
  maling: [
    { name: "Flügger", category: "Maling" },
    { name: "Sadolin", category: "Maling" },
    { name: "Bauhaus", category: "Byggemarked" },
  ],
  mad: [
    { name: "Føtex", category: "Supermarked" },
    { name: "Netto", category: "Discount" },
    { name: "Rema 1000", category: "Discount" },
    { name: "Lidl", category: "Discount" },
  ],
  indkøb: [
    { name: "Føtex", category: "Supermarked" },
    { name: "Rema 1000", category: "Discount" },
    { name: "Netto", category: "Discount" },
  ],
  medicin: [
    { name: "Apoteket", category: "Apotek" },
  ],
  apotek: [
    { name: "Apoteket", category: "Apotek" },
  ],
  dyre: [
    { name: "Dyrecenter", category: "Dyrehandel" },
    { name: "Fætter BR", category: "Legetøj" },
  ],
  legetøj: [
    { name: "Fætter BR", category: "Legetøj" },
    { name: "Søstrene Grene", category: "Bolig" },
  ],
  bil: [
    { name: "Shell", category: "Benzin" },
    { name: "Circle K", category: "Benzin" },
    { name: "OK", category: "Benzin" },
    { name: "Biltema", category: "Biludstyr" },
  ],
  benzin: [
    { name: "Shell", category: "Benzin" },
    { name: "Circle K", category: "Benzin" },
    { name: "OK", category: "Benzin" },
  ],
  bank: [
    { name: "Danske Bank", category: "Bank" },
    { name: "Nordea", category: "Bank" },
    { name: "Jyske Bank", category: "Bank" },
  ],
  kontor: [
    { name: "Søstrene Grene", category: "Bolig" },
    { name: "Bilka", category: "Stormagasin" },
  ],
  møbler: [
    { name: "IKEA", category: "Møbler" },
    { name: "Ilva", category: "Møbler" },
    { name: "Søstrene Grene", category: "Bolig" },
  ],
  tøj: [
    { name: "H&M", category: "Tøj" },
    { name: "Zara", category: "Tøj" },
    { name: "Magasin", category: "Stormagasin" },
  ],
  sko: [
    { name: "Deichmann", category: "Sko" },
    { name: "Birkenstock", category: "Sko" },
  ],
  værktøj: [
    { name: "Silvan", category: "Byggemarked" },
    { name: "Stark", category: "Byggemarked" },
    { name: "Biltema", category: "Biludstyr" },
  ],
  møde: [
    { name: "Danske Bank", category: "Bank" },
    { name: "Nordea", category: "Bank" },
  ],
};

function normalizeKeyword(value: string): string {
  return value
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function suggestPlacesForChecklist(
  checklistName: string,
  itemTitles: string[] = []
): SuggestedPlace[] {
  const text = normalizeKeyword(`${checklistName} ${itemTitles.join(" ")}`);
  const words = text.split(/\s+/).filter(Boolean);

  const seen = new Set<string>();
  const results: SuggestedPlace[] = [];
  const keywords = Object.keys(PLACE_SUGGESTIONS).map((raw) => ({
    raw,
    normalized: normalizeKeyword(raw),
  }));

  for (const word of words) {
    for (const { raw, normalized: keyword } of keywords) {
      if (word === keyword || word.startsWith(keyword)) {
        for (const place of PLACE_SUGGESTIONS[raw]) {
          if (seen.has(place.name)) continue;
          seen.add(place.name);
          results.push(place);
        }
      }
    }
  }

  if (results.length === 0) {
    const fallbacks: SuggestedPlace[] = [
      { name: "Føtex", category: "Supermarked" },
      { name: "Rema 1000", category: "Discount" },
      { name: "Silvan", category: "Byggemarked" },
    ];
    for (const place of fallbacks) {
      if (!seen.has(place.name)) {
        seen.add(place.name);
        results.push(place);
      }
    }
  }

  return results;
}

const cases = [
  {
    id: "GEO-002-1",
    name: "IT-udstyr",
    items: ["Køb ny computer", "mus og tastatur"],
    expected: ["Elgiganten", "Power", "Proshop", "ComputerSalg"],
  },
  {
    id: "GEO-002-2",
    name: "Maling til stuen",
    items: ["Vægmaling", "rulle og pensel"],
    expected: ["Flügger", "Sadolin", "Bauhaus"],
  },
  {
    id: "GEO-002-3",
    name: "Indkøb",
    items: ["Mælk", "brød"],
    expected: ["Føtex", "Rema 1000", "Netto"],
  },
  {
    id: "GEO-002-4",
    name: "Havearbejde",
    items: ["Jord", "planter"],
    expected: ["Plantorama", "Bauhaus", "Silvan"],
  },
  {
    id: "GEO-002-5",
    name: "Biludstyr",
    items: ["Oliefilter", "værktøj"],
    expected: ["Biltema", "Shell", "Circle K", "OK"],
  },
  {
    id: "GEO-002-6",
    name: "Ukendt emne",
    items: ["xyz123"],
    expected: ["Føtex", "Rema 1000", "Silvan"],
  },
];

let failures = 0;

for (const c of cases) {
  const result = suggestPlacesForChecklist(c.name, c.items);
  const names = result.map((p) => p.name);
  const ok = c.expected.every((e) => names.includes(e));
  if (!ok) {
    failures++;
    console.log(`\n❌ ${c.id} FAILED`);
    console.log("Name:    ", c.name);
    console.log("Items:   ", c.items);
    console.log("Expected:", c.expected);
    console.log("Actual:  ", names);
  } else {
    console.log(`✅ ${c.id}`);
  }
}

console.log(`\n${failures === 0 ? "✅ All passed" : `❌ ${failures} failed`}`);
process.exit(failures > 0 ? 1 : 0);
