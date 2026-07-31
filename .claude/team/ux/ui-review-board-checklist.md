# UI/UX Review: Board, checklist og item-kommentar

Dato: 2026-07-15
Agent: UI/UX Agent
Filer gennemgået:
- `app/(tabs)/board.tsx`
- `app/checklist.tsx`
- `app/item.tsx`

## 1. Review af Board-knapper (Optag vs Tilføj)

### Observation
Brugeren ønsker, at "Tilføj"-knappen skal have samme størrelse som "Optag".

### Nuværende implementering
Begge knapper deler grundstilen `styles.addButton` med:
- `paddingHorizontal: 14`
- `paddingVertical: 8`
- `borderRadius: 8`
- `minWidth: 96`

"Optag" har `backgroundColor: "#f87171"` via `voiceButton`; "Tilføj" falder tilbage på `#38bdf8`.

Fordi der kun er `minWidth` og ikke fast `width`, bestemmes den faktiske bredde af tekstindholdet. "🎤 Optag" og "+ Tilføj" har forskellig tekstlængde, så knapperne kan få forskellig bredde i praksis — særligt hvis tekststørrelse/accessibility ændres.

### Anbefalinger
1. **Ens fast bredde**: Skift `minWidth: 96` ud med `width: 96` i `styles.addButton`, så knapperne altid er identiske.
2. **Alternativ**: Lad knapperne fylde lige meget via `flex: 1` i `headerButtons` med en fælles `minWidth`.
3. **Visuel hierarki**: Overvej om "Optag" (voice) skal fremstå som primær eller sekundær. Pt. er begge lige store, men med stærke, forskellige farver. Sørg for kontrasten opfylder WCAG AA.
4. **Accessibility**: Tilføj `accessible`, `accessibilityRole="button"` og `accessibilityLabel` på begge knapper. Overvej tekstlige labels i stedet for kun emojis for skærmlæsere.

### Foreslået style-ændring
```js
addButton: {
  backgroundColor: "#38bdf8",
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 8,
  width: 96,        // fast bredde
  alignItems: "center",
  justifyContent: "center",
},
voiceButton: {
  backgroundColor: "#f87171",
},
```

---

## 2. Forslag til visning af ansvarlig i checklist-item-card

### Observation
"Ansvarlig fremgår ikke i sagen i listen."

### Nuværende implementering
- `ChecklistItem` i `services/checklists.ts` har ikke egne `assignedTo` / `assignedToName`-felter.
- I `checklist.tsx` viser kortet: titel, noter, badges (Nyt match / Måske duplikat), source-link, udført-meta og Rediger/Slet-handlinger.
- For dynamiske lister kendes `sourceItemId`, men den tilknyttede sags ansvarlige vises ikke.

### Forslag
1. **Data**: Berig dynamiske checklist-punkter med `assignedTo` og `assignedToName` fra kildesagen under synkronisering, eller slå op via `projectItems`-state i `checklist.tsx`.
2. **UI**: Tilføj en meta-linje under titel/noter:
   - `👤 [ansvarlig]` eller
   - `Ansvarlig: [ansvarlig]`
3. **Style**: Genbrug det blå assignee-look fra `board.tsx` for genkendelighed:
   ```js
   assigneeRow: { marginTop: 4, marginBottom: 2 },
   assigneeText: { fontSize: 12, color: "#38bdf8", fontWeight: "600" },
   ```
4. **Fallback**: Vis kun linjen, når der er en ansvarlig — undgå tomme felter og visuel støj.
5. **Fremtid**: Overvej at gøre ansvarlig redigerbar på manuelle checklist-punkter (oprettelse + redigeringsmodal).

---

## 3. Analyse af kommentar-bug i item.tsx

### Observation
"Når man skriver kommentar i en sag, forsvinder 'Tilbage' og man kan ikke komme ud."

### Rodårsag
Hele skærmen i `item.tsx` er pakket ind i et `KeyboardAvoidingView`:
```jsx
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
```
Indeni ligger:
1. En fast header med "← Tilbage".
2. Et `ScrollView` med sagens indhold.
3. En `commentInputBar` nederst.

På iOS med `behavior="padding"` skubber `KeyboardAvoidingView` hele det indre View op for at gøre plads til tastaturet. Fordi headeren er øverst i det indre View, kan "← Tilbage" blive skubbet ud over toppen af skærmen, når kommentarfeltet får fokus. Det efterlader brugeren uden synlig tilbage-knap.

### Konkret fix
Adskil headeren fra det indhold, der skal reagere på tastaturet. Kun ScrollView og commentInputBar skal være inde i `KeyboardAvoidingView`.

### Foreslået struktur
```jsx
<View style={{ flex: 1 }}>
  {/* Fast header - rører sig ikke når tastaturet åbner */}
  <View style={styles.headerRow}>
    <TouchableOpacity onPress={() => router.back()}>
      <Text style={styles.backText}>← Tilbage</Text>
    </TouchableOpacity>
  </View>

  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
  >
    <View style={{ flex: 1 }}>
      <ScrollView ...>
        {editing ? renderEdit() : renderView()}
      </ScrollView>

      {!editing && canComment(projectRole) ? (
        <View style={styles.commentInputBar}>...</View>
      ) : null}
    </View>
  </KeyboardAvoidingView>
</View>
```

### Supplerende forslag
- Tilføj `keyboardVerticalOffset` om nødvendigt for at justere input-barens position.
- Overvej at skifte iOS `behavior` til `"height"` og test på flere skærmstørrelser.
- Sørg for, at systemets tilbage-knap / gesture stadig virker, selv hvis headeren skulle forsvinde midlertidigt.

---

## 4. Prioriterede anbefalinger

| # | Problem | Effekt | Betydning |
|---|---------|--------|-----------|
| 1 | "Tilbage" forsvinder ved kommentar | Blokerer brugeren; kritisk UX-bug | Høj |
| 2 | Ansvarlig vises ikke i checklist | Manglende information i arbejdsgang | Medium |
| 3 | Board-knapper kan få ulige bredde | Visuel ujævnhed; hurtig fix | Medium/lav |

### Næste skridt
1. Udvikler adskiller header fra `KeyboardAvoidingView` i `item.tsx` og test på iOS + Android.
2. Udvikler tilføjer `assignedTo` / `assignedToName` data og visning i checklist-item-card.
3. Udvikler sætter fast `width` på Board-knapper.
4. PO/QA gennemgår og godkender ændringerne før næste build.
