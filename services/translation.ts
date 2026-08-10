// Oversættelsestjeneste til OCR-tekst.
// Bruger Google Cloud Translation som primær og MyMemory som fallback.

export interface Language {
  code: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "auto", label: "Auto" },
  { code: "da", label: "Dansk" },
  { code: "en", label: "Engelsk" },
  { code: "de", label: "Tysk" },
  { code: "sv", label: "Svensk" },
  { code: "no", label: "Norsk" },
  { code: "fr", label: "Fransk" },
  { code: "es", label: "Spansk" },
  { code: "it", label: "Italiensk" },
  { code: "nl", label: "Nederlandsk" },
  { code: "pl", label: "Polsk" },
  { code: "fi", label: "Finsk" },
];

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY;

interface GoogleTranslateResponse {
  data?: {
    translations?: Array<{ translatedText: string }>;
  };
  error?: { message: string };
}

interface MyMemoryResponse {
  responseData?: {
    translatedText: string;
  };
  responseStatus?: number;
}

async function translateWithGoogle(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
    const body: Record<string, unknown> = {
      q: text,
      target: targetLang,
      format: "text",
    };
    if (sourceLang && sourceLang !== "auto") {
      body.source = sourceLang;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await response.json()) as GoogleTranslateResponse;
    if (!response.ok || json.error) {
      const errorMessage = json.error?.message || `HTTP ${response.status}`;
      console.error("[translateWithGoogle] API error", {
        message: errorMessage,
        status: response.status,
        targetLang,
        sourceLang,
        textLength: text.length,
      });
      return null;
    }

    return json.data?.translations?.[0]?.translatedText || null;
  } catch (error) {
    console.log("Google translate request error", error);
    return null;
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#37;/g, "%")
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&#38;/g, "&")
    .replace(/&#60;/g, "<")
    .replace(/&#62;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function translateWithMyMemory(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string | null> {
  try {
    const pairSource = sourceLang && sourceLang !== "auto" ? sourceLang : "Autodetect";
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${pairSource}|${targetLang}`;

    const response = await fetch(url);
    const json = (await response.json()) as MyMemoryResponse;

    if (!response.ok || String(json.responseStatus) !== "200") {
      console.error("[translateWithMyMemory] API error:", {
        status: response.status,
        responseStatus: json.responseStatus,
        responseDetails: (json as { responseDetails?: string }).responseDetails,
        targetLang,
        sourceLang,
        textLength: text.length,
      });
      return null;
    }

    const raw = json.responseData?.translatedText || null;
    return raw ? decodeHtmlEntities(raw) : null;
  } catch (error) {
    console.log("MyMemory translate request error", error);
    return null;
  }
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = "auto"
): Promise<string> {
  if (!text.trim() || !targetLang || targetLang === "auto") {
    throw new Error("Vælg et målsprog");
  }

  const googleResult = await translateWithGoogle(text, targetLang, sourceLang);
  if (googleResult) return googleResult;

  const myMemoryResult = await translateWithMyMemory(text, targetLang, sourceLang);
  if (myMemoryResult) return myMemoryResult;

  console.error("[translateText] Both translation providers failed", {
    targetLang,
    sourceLang,
    textLength: text.length,
    googleApiKeyPresent: !!GOOGLE_API_KEY,
  });
  throw new Error("Oversættelse kunne ikke gennemføres. Tjek netværk, API-nøgle og målsprog.");
}

export function getLanguageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.label || code;
}
