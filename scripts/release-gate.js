// Release Gate script for Data Capture
// Køres af udvikler/Claude Code før enhver "frigivelse" til bruger-test.
// Sikrer at kode er type-checket, lintet, og at grundlæggende runtime-sikkerhed er OK.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EXIT_OK = 0;
const EXIT_FAIL = 1;

let failures = 0;
let warnings = 0;

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

console.log("🛡️  Release Gate: Tjekker om kode er klar til bruger-test...\n");

// 1. Pre-test check
console.log("🔍 1. Kører pre-test check");
try {
  run("npm run pre-test-check", { stdio: "ignore" });
  log("Pre-test check", "OK");
} catch (error) {
  failures++;
  log("Pre-test check", "FAIL", "Kør 'npm run pre-test-check' for detaljer");
}

// 2. TypeScript strict check
console.log("\n🔍 2. TypeScript strict check");
try {
  run("npx tsc --noEmit", { stdio: "ignore" });
  log("TypeScript", "OK");
} catch (error) {
  failures++;
  log("TypeScript", "FAIL");
}

// 3. Expo lint check (kun errors, ikke warnings)
console.log("\n🔍 3. Expo lint check (errors only)");
try {
  const lintOutput = run("npx expo lint");
  const hasErrors = /\b\d+ errors?\b/.test(lintOutput) && !lintOutput.includes("0 errors");
  if (hasErrors) {
    failures++;
    log("Expo lint", "FAIL", "Der er lint errors");
  } else {
    log("Expo lint", "OK", "Ingen errors (warnings kan accepteres)");
  }
} catch (error) {
  failures++;
  log("Expo lint", "FAIL", "Lint fejlede");
}

// 4. Check at der ikke er native imports der crasher ved opstart
console.log("\n🔍 4. Runtime-sikkerhed: native imports");
const nativeModulePackages = [
  "@react-native-firebase/storage",
  "@react-native-firebase/auth",
  "@react-native-firebase/firestore",
  "expo-mlkit-ocr",
  "expo-clipboard",
];
const filesToCheck = [
  path.join(ROOT, "services", "media.ts"),
  path.join(ROOT, "contexts", "AuthContext.tsx"),
  path.join(ROOT, "services", "ocr.ts"),
  path.join(ROOT, "services", "deeplinks.ts"),
];
// services/firebase.ts is the central Firebase initialization file and may use top-level native imports.
let nativeImportOk = true;
for (const file of filesToCheck) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf-8");
  const hasTopLevelNativeImport = nativeModulePackages.some((pkg) =>
    new RegExp(`^import\\s+.*\\s+from\\s+["']${pkg.replace("/", "\\/")}["']`, "m").test(content)
  );
  const hasLazyLoad = content.includes("require(") || /try\s*\{/.test(content);
  if (hasTopLevelNativeImport && !hasLazyLoad) {
    failures++;
    log(path.relative(ROOT, file), "FAIL", "Top-level native import uden lazy load");
    nativeImportOk = false;
  }
}
if (nativeImportOk) {
  log("Native imports", "OK", "Lazy load / try-catch anvendt");
}

// 5. Check at collaboration board er opdateret inden for seneste dage
console.log("\n🔍 5. Dokumentation opdateret?");
const boardPath = path.join(ROOT, "docs", "collaboration-board.md");
const compliancePath = path.join(ROOT, "docs", "compliance-log.md");
const boardStat = fs.statSync(boardPath);
const complianceStat = fs.statSync(compliancePath);
const now = Date.now();
const boardAgeDays = (now - boardStat.mtimeMs) / (1000 * 60 * 60 * 24);
const complianceAgeDays = (now - complianceStat.mtimeMs) / (1000 * 60 * 60 * 24);

if (boardAgeDays > 7) {
  warnings++;
  log("Collaboration board", "WARN", "Ikke opdateret i 7 dage");
} else {
  log("Collaboration board", "OK", `Opdateret for ${Math.floor(boardAgeDays * 24)} timer siden`);
}

if (complianceAgeDays > 7) {
  warnings++;
  log("Compliance log", "WARN", "Ikke opdateret i 7 dage");
} else {
  log("Compliance log", "OK", `Opdateret for ${Math.floor(complianceAgeDays * 24)} timer siden`);
}

// Summary
console.log("\n📊 Release Gate Opsummering");
console.log(`❌ Failures: ${failures}`);
console.log(`⚠️  Warnings: ${warnings}`);

if (failures > 0) {
  console.log("\n🛑 FRIGIVELSE AFVIST. Ret fejlene før bruger-test.");
  process.exit(EXIT_FAIL);
}

if (warnings > 0) {
  console.log("\n⚠️  FRIGIVELSE MULIG MED FORBEHOLD. Vurder warnings før bruger-test.");
  process.exit(EXIT_OK);
}

console.log("\n✅ FRIGIVELSE GODKENDT. Koden er klar til bruger-test.");
process.exit(EXIT_OK);
