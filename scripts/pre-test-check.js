// Pre-test check script for Data Capture
// Køres før lokal test eller build for at fange almindelige fejl tidligt.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const EXIT_OK = 0;
const EXIT_WARN = 1;
const EXIT_FAIL = 2;

let warnings = 0;
let failures = 0;

function log(title, status, detail = "") {
  const icon = status === "OK" ? "✅" : status === "WARN" ? "⚠️" : "❌";
  console.log(`${icon} ${title}${detail ? ` – ${detail}` : ""}`);
}

function run(cmd, options = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  });
}

// 1. TypeScript check
console.log("\n🔍 1. TypeScript check");
try {
  run("npx tsc --noEmit", { stdio: "ignore" });
  log("TypeScript", "OK");
} catch (error) {
  failures++;
  log("TypeScript", "FAIL", "Kør 'npx tsc --noEmit' for detaljer");
}

// 2. Expo lint check
console.log("\n🔍 2. Expo lint check");
try {
  const lintOutput = run("npx expo lint");
  const hasErrors = /\b\d+ errors?\b/.test(lintOutput) && !lintOutput.includes("0 errors");
  const hasWarnings = lintOutput.includes("warning");
  if (hasErrors) {
    failures++;
    log("Expo lint", "FAIL", "Der er lint errors");
  } else if (hasWarnings) {
    warnings++;
    log("Expo lint", "WARN", `Der er warnings, men ingen errors`);
  } else {
    log("Expo lint", "OK");
  }
} catch (error) {
  failures++;
  log("Expo lint", "FAIL", "Lint fejlede");
}

// 3. Package compatibility check
console.log("\n🔍 3. Expo package compatibility");
try {
  const checkOutput = run("npx expo install --check");
  if (checkOutput.includes("should be updated")) {
    warnings++;
    log("Package versions", "WARN", "Der er pakker der bør opdateres");
  } else {
    log("Package versions", "OK");
  }
} catch (error) {
  warnings++;
  log("Package versions", "WARN", "Kunne ikke tjekke pakker");
}

// 4. Check for native module imports that crash in Expo Go / old dev builds
console.log("\n🔍 4. Native module import robusthed");
const nativeModulePackages = [
  "@react-native-firebase/storage",
  "@react-native-firebase/auth",
  "@react-native-firebase/firestore",
  "expo-mlkit-ocr",
  "expo-clipboard",
];
const nativeModuleFiles = [
  path.join(ROOT, "services", "media.ts"),
  path.join(ROOT, "contexts", "AuthContext.tsx"),
  path.join(ROOT, "services", "ocr.ts"),
  path.join(ROOT, "services", "deeplinks.ts"),
];
// services/firebase.ts is the central Firebase initialization file and may use top-level native imports.

let nativeImportOk = true;
for (const filePath of nativeModuleFiles) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, "utf-8");
  const hasTopLevelNativeImport = nativeModulePackages.some((pkg) =>
    new RegExp(`^import\\s+.*\\s+from\\s+["']${pkg.replace("/", "\\/")}["']`, "m").test(content)
  );
  const hasLazyLoad = content.includes("require(") || /try\s*\{/.test(content);
  if (hasTopLevelNativeImport && !hasLazyLoad) {
    failures++;
    log(path.relative(ROOT, filePath), "FAIL", "Top-level native import uden lazy load");
    nativeImportOk = false;
  }
}
if (nativeImportOk) {
  log("Native module imports", "OK", "Lazy load / try-catch anvendt");
}

// 5. Check that deep link helpers exist
console.log("\n🔍 5. Deep link helpers");
const deeplinkPath = path.join(ROOT, "services", "deeplinks.ts");
if (fs.existsSync(deeplinkPath) && fs.readFileSync(deeplinkPath, "utf-8").includes("datacapture")) {
  log("Deep links", "OK");
} else {
  failures++;
  log("Deep links", "FAIL", "Manglende eller forkert deeplinks helper");
}

// 6. Voice parser verification
console.log("\n🔍 6. Voice parser verification");
try {
  run("npx tsx scripts/verify-voice-parser.ts", { stdio: "ignore" });
  log("Voice parser", "OK");
} catch (error) {
  failures++;
  log("Voice parser", "FAIL", "Parser-output afviger fra godkendte eksempler");
}

// 7. Check that default exports exist on main routes
console.log("\n🔍 7. Route default exports");
const routes = [
  "app/(tabs)/index.tsx",
  "app/(tabs)/board.tsx",
  "app/(tabs)/search.tsx",
  "app/(tabs)/checklists.tsx",
  "app/(tabs)/settings.tsx",
  "app/index.tsx",
  "app/item.tsx",
  "app/checklist.tsx",
];

for (const route of routes) {
  const filePath = path.join(ROOT, route);
  if (!fs.existsSync(filePath)) {
    failures++;
    log(route, "FAIL", "Fil findes ikke");
    continue;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.includes("export default function")) {
    failures++;
    log(route, "FAIL", "Mangler default export");
  } else {
    log(route, "OK");
  }
}

// Summary
console.log("\n📊 Opsummering");
console.log(`✅ OK`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Failures: ${failures}`);

if (failures > 0) {
  console.log("\n🛑 START IKKE APPEN / BYG IKKE. Ret fejlene først.");
  process.exit(EXIT_FAIL);
}

if (warnings > 0) {
  console.log("\n⚠️  Der er warnings, men du kan fortsætte med forbehold.");
  process.exit(EXIT_OK);
}

console.log("\n✅ Alt ser OK ud. Du kan starte appen med 'npx expo start --clear'");
process.exit(EXIT_OK);
