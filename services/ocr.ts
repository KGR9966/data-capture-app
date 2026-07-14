let recognizeTextModule: any = null;

function getRecognizeText() {
  if (recognizeTextModule) return recognizeTextModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    recognizeTextModule = require("expo-mlkit-ocr").recognizeText;
    return recognizeTextModule;
  } catch {
    return null;
  }
}

export async function extractTextFromImage(uri: string): Promise<string> {
  const recognizeText = getRecognizeText();
  if (!recognizeText) {
    throw new Error(
      "OCR native module er ikke tilgængelig. Geninstaller appen med seneste build."
    );
  }
  try {
    const result = await recognizeText(uri);
    return (result.text || "").trim();
  } catch (error) {
    console.warn("[ocr] Tekstgenkendelse fejlede:", error);
    throw new Error("Kunne ikke læse tekst fra billedet.");
  }
}
