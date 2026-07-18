# VOICE-001 – Forbedret stemmeindtaling

> Backlog-case: Brugeren oplever, at stemmeindtaling ofte skriver forkert, sætter ord sammen og mangler linjeskift. Der ønskes kommandoord, post-processing og redigerbart preview før gem.
> Dato: 2026-07-15
> Status: `proposed` (afventer PO-prioritering)

---

## Problem / brugerværdi

Stemmeindtaling er en hurtig måde at fange tanker og observationer på, men den nuværende oplevelse er frustrerende:
- Talegenkendelsen skriver ord forkert eller sætter dem sammen ("vandkande" i stedet for "vand kande").
- Der er ingen nem måde at indsætte linjeskift eller tegnsætning.
- Auto-save kan oprette uønskede items, mens brugeren stadig gennemgår transkriptionen.
- Der er ingen mulighed for at rette teksten, før den gemmes.

En bedre stemmeoplevelse øger hastigheden og kvaliteten af captures markant.

---

## Foreslåede funktioner

### 1. Kommandoord under indtaling

Brugeren siger bestemte ord, som appen opfatter som kommandoer:

| Kommando | Resultat |
|---|---|
| "skift" eller "ny linje" | Indsæt linjeskift (`\n`) |
| "punktum" | Indsæt `.` |
| "komma" | Indsæt `,` |
| "semikolon" | Indsæt `;` |
| "spørgsmålstegn" | Indsæt `?` |
| "udråbstegn" | Indsæt `!` |
| "kolon" | Indsæt `:` |
| "tankestreg" | Indsæt `-` |
| "slet sidste ord" | Fjerner sidste ord |
| "fortryd" | Sletter hele indtalingen |
| "gem" / "opret" | Gemmer item |
| "annuller" | Annullerer og lukker |

### 2. Post-processing af transkription

Efter talegenkendelse kører en lokal tekstbehandling:

- **Tilføj mellemrum efter tegnsætning**: "hej.jeg hedder" → "hej. jeg hedder"
- **Fjern dobbeltmellemrum**: "vand  kande" → "vand kande"
- **Korriger tal til ord (kontekstafhængigt)**: "2 liter mælk" → "to liter mælk" (valgfrit)
- **Bevar kommandoord som tegnsætning**: "skift" bliver til linjeskift, ikke ordet "skift"
- **Trim leading/trailing whitespace**

### 3. Redigerbart preview før gem

I stedet for auto-save viser appen:

1. Et redigerbart tekstfelt med transkriptionen.
2. En tydelig "Gem"-knap.
3. En "Annuller"-knap.
4. (Valgfrit) en "Lyt igen"-knap, hvis vi gemmer lyden.

Dette løser også auto-save-problemet, som UX-auditen fremhævede.

### 4. Fase 2: AI-korrektur

- "Mente du...?" forslag.
- Kontekstbaseret opdeling af sammensatte ord.
- Automatisk punktum/komma baseret på pauser.

---

## Tekniske overvejelser

- Kommandoord kan implementeres som en simpel tekst-erstatning efter talegenkendelse, før teksten vises.
- Post-processing køres client-side; ingen backend nødvendig.
- Redigerbart preview kræver ændring i `VoiceCaptureModal.tsx` og fjernelse/ændring af auto-save.
- Hvis auto-save beholdes, bør det være opt-in eller have en "fortryd" toast.

---

## MVP-anbefaling

1. Implementer kommandoord: "skift", "punktum", "komma", "slet sidste ord", "fortryd", "gem", "annuller".
2. Tilføj post-processing: mellemrum efter tegnsætning, fjern dobbeltmellemrum, trim.
3. Skift auto-save til redigerbart preview med manuel gem.

AI-korrektur og stemmeoptagelses-gem tilføjes i fase 2.

---

## Relateret

- UX-audit-finding om auto-save i `VoiceCaptureModal.tsx`.
- Voice-input søgning, som allerede findes i appen.
- CHECKLIST-001 / Context Lists — stemme kan også bruges til at tilføje punkter senere.
