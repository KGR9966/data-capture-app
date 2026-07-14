path = "app/(tabs)/board.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },"""

new = """    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    headerButtons: {
      flexDirection: "row",
      gap: 8,
    },"""

content = content.replace(old, new)

old2 = """    addButton: {
      backgroundColor: "#38bdf8",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },"""

new2 = """    addButton: {
      backgroundColor: "#38bdf8",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    voiceButton: {
      backgroundColor: "#f87171",
    },"""

content = content.replace(old2, new2)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated board styles")
