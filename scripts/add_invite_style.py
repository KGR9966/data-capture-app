import sys

path = "app/(tabs)/index.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    activeBadge: {
      marginTop: 10,
      color: "#38bdf8",
      fontSize: 12,
      fontWeight: "700",
    },"""

new = """    activeBadge: {
      marginTop: 10,
      color: "#38bdf8",
      fontSize: 12,
      fontWeight: "700",
    },
    inviteHint: {
      marginTop: 6,
      color: isDark ? "#64748b" : "#94a3b8",
      fontSize: 11,
    },"""

if old in content:
    content = content.replace(old, new)
    print("Added inviteHint style")
else:
    print("Pattern not found")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
