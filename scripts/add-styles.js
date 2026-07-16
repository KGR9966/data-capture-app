const fs = require("fs");
const path = require("path");

const p = path.resolve(__dirname, "../app/(tabs)/index.tsx");
let s = fs.readFileSync(p, "utf8");

const old = `    buttonDisabled: {\r\n      opacity: 0.5,\r\n    },\r\n  });\r\n}`;

const idx = s.lastIndexOf(old);
if (idx === -1) {
  console.log("not found");
  process.exit(1);
}

const ins = `    buttonDisabled: {\r\n      opacity: 0.5,\r\n    },\r\n    membersModalContent: {\r\n      maxHeight: "80%",\r\n      paddingVertical: 16,\r\n    },\r\n    membersList: {\r\n      maxHeight: 400,\r\n      marginBottom: 12,\r\n    },\r\n    membersCloseButton: {\r\n      alignSelf: "stretch",\r\n    },\r\n    memberProjectBlock: {\r\n      marginBottom: 16,\r\n      paddingBottom: 12,\r\n      borderBottomWidth: 1,\r\n      borderBottomColor: isDark ? "#334155" : "#e2e8f0",\r\n    },\r\n    memberProjectName: {\r\n      fontSize: 16,\r\n      fontWeight: "700",\r\n      color: isDark ? "#f8fafc" : "#0f172a",\r\n      marginBottom: 6,\r\n    },\r\n    memberEmail: {\r\n      fontSize: 14,\r\n      color: isDark ? "#94a3b8" : "#64748b",\r\n      marginLeft: 8,\r\n      marginBottom: 2,\r\n    },\r\n    emptyMemberText: {\r\n      fontSize: 14,\r\n      color: isDark ? "#94a3b8" : "#64748b",\r\n      textAlign: "center",\r\n      marginTop: 20,\r\n    },\r\n  });\r\n}`;

s = s.slice(0, idx) + ins + s.slice(idx + old.length);
fs.writeFileSync(p, s);
console.log("OK");
