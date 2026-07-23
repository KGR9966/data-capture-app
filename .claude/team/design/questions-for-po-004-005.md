# Afklarende spørgsmål til PO - US-004 og US-005

Dette dokument samler de spørgsmål, som Userstoryagent og Creative/AI Challenger Agent har brug for svar på, før der kan fastlægges scope og design for de to user stories.

---

## US-004: Ensartet og robust optagelse/oprettelse af sager

### Felter og formular

1. **Titel vs. tekst:** Skal oprettelsesmodalen have ét primært tekstfelt med auto-udledt titel, eller skal Titel og Beskrivelse forblive adskilte felter?
2. **Type-vælger:** Skal Type altid vises som manuelle chips, eller må AI skjule den eller give forslag, når den er sikker?
3. **Kategori-input:** Skal Kategori være frit tekst, dropdown over eksisterende kategorier, eller smart autocomplete med AI-forslag?
4. **Type vs. Kategori:** Er du enig i, at Type er sagens karakter/input-kanal og Kategori er emne/bucket, og at Type kun sætter et udgangspunkt for Kategori?
5. **Typevalg i "+ Tilføj":** Skal "Stemme" og "Foto" være valgbare som Type i den manuelle oprettelse, eller kun sættes automatisk ud fra input-kanalen?
6. **Validering:** Skal der kræves titel, indhold, eller er det nok med én af dem?
7. **Ansvarlig default:** Skal Ansvarlig default være "mig" eller "ingen ansvarlig"?

### Optagelse og auto gem

8. **Auto-gem timeout:** Hvor mange sekunders stilhed skal udløse auto-gem (foreslået 5 sekunder), og skal auto-gem være slået til eller fra som standard?
9. **Efter auto-gem:** Skal modalen lukke efter auto-gem, eller forblive åben så brugeren kan optage flere sager i træk?
10. **OS-timeout:** Hvis platformen selv stopper optagelsen, skal appen informere, genoptage automatisk eller tilbyde at fortsætte i en ny optagelse?
11. **Hjælpetekst:** Hvilken præcis hjælpetekst ønsker du under optageknappen?
12. **Optagevarighed:** Skal brugeren se en levende timer (f.eks. 00:23) mens der optages?

### AI-hjælp

13. **AI-forslag til Type/Kategori:** Er du indforstået med, at AI foreslår type og kategori, men brugeren altid kan overskrive?
14. **AI-data:** Hvis AI-berigelse kræver ekstern API, er du okay med at tekst sendes til en sikker LLM-tjeneste, eller skal alt køre lokalt/heuristisk?

---

## US-005: Dynamiske lister og søgeportal

### Placering og scope

1. **Portalplacering:** Skal søgeportalen være en ny fane, eller skal den eksisterende "Aktionslister"-fane udvides med dynamiske lister og faste oversigter?
2. **Projekt-scope:** Skal dynamiske lister være globale (alle projekter) eller knyttet til ét projekt?
3. **Faste portal-søgninger:** Skal portalen vise foruddefinerede dynamiske søgninger (f.eks. "Åbne fejl", "Dine idéer"), eller kun brugeroprettede lister?

### Dynamiske lister

4. **Nye matches:** Når en dynamisk liste får nye matches, skal de markeres som "nye", eller skal de bare tilføjes stille?
5. **Fjernelse af matches:** Hvis en sag ikke længere matcher søgningen, skal listepunktet så fjernes automatisk, eller beholdes?
6. **Tilføj egne punkter:** Skal brugeren kunne tilføje egne punkter til en dynamisk liste? Hvis ja, skal de samtidig oprettes som sager, så den dynamiske søgning fanger dem?

### Listepunkter og indhold

7. **Felter til punkter:** Hvilke felter fra en sag skal generere listepunkter? Kun titel, eller også beskrivelse/OCR opdelt i punkter?
8. **Deduplikering:** Skal deduplikering være streng (identisk titel) eller semantisk (AI)?
9. **Sortering:** Skal åbne punkter sorteres alfabetisk, efter dato, prioritet, eller give brugeren flere valg?

### Status og deling

10. **Status-synkronisering:** Skal afkrydsning automatisk sætte kildesagen til "done"/"archived"? Altid eller kun når brugeren slår det til per liste?
11. **Delt format:** Skal deling være ren tekst (SMS/e-mail), et dyb link tilbage til appen, eller begge dele?
12. **Offline:** Skal lister kunne redigeres offline og synkronisere senere?
13. **Notifikationer:** Ønsker du påmindelser om åbne listepunkter? (Notifikationer ved nye matches anses for støjende.)

---

## Fælles / krydsklip

1. **AI-generelle forslag:** Er du indforstået med, at AI-forslag vises som ikke-tvingende forslag, som brugeren altid kan overskride?
2. **Data til ekstern AI:** Hvis AI-funktioner kræver ekstern API, accepterer du at sende tekstdata til en sikker LLM-tjeneste under gældende databehandlingsvilkår?
3. **Faseopdeling:** Er du enig i at dele arbejdet i faser, så første fase fokuserer på grundlæggende funktionalitet, og AI-berigelser kommer i en senere fase?
