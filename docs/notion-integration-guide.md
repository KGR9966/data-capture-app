# Notion Integration Guide — Data Capture

Denne guide beskriver, hvordan du giver Claude Code adgang til at oprette og vedligeholde Notion-boarder for Data Capture-projektet.

## 1. Opret en Notion integration

1. Gå til [https://notion.so/my-integrations](https://notion.so/my-integrations).
2. Klik **+ New integration**.
3. Udfyld felterne:
   - **Name:** `Data Capture Bot` (eller et andet navn du kan genkende)
   - **Associated workspace:** Vælg din arbejdsplads
   - **Type:** `Internal`
   - **Logo:** Valgfrit
4. Klik **Submit**.

## 2. Kopier integration token

1. På integrationssiden klikker du **Show** ved **Internal Integration Token**.
2. Klik **Copy**.
3. Token ser ud som `secret_...` og må ikke deles offentligt.

## 3. Del sider/databaser med integrationen

Integrationen har ikke adgang til noget automatisk. Du skal invitere den for hver side eller database:

1. Åbn den Notion-side/database, jeg skal arbejde med.
2. Klik **Share** øverst til højre.
3. Klik **Add connections**.
4. Søg efter navnet på din integration (f.eks. `Data Capture Bot`).
5. Vælg den og klik **Confirm**.
6. Sæt rettigheder til **Can edit** hvis jeg skal oprette og opdatere; **Can read** hvis jeg kun skal læse.

## 4. Indsæt token og page ID

Åbn filen `C:\Users\kimgr\data-capture-app\.env` og tilføj følgende to linjer i bunden:

```env
NOTION_TOKEN=secret_...
NOTION_ROOT_PAGE_ID=...
```

Erstat værdierne med det faktiske token og page ID.

### Find dit root page ID

1. Åbn den Notion-side, der skal være overmappe for boarderne.
2. URL'en ser sådan ud:
   ```
   https://www.notion.so/Dine-Projekter-abc123def456ghi789jkl012mno345p
   ```
3. Det sidste afsnit efter bindestregen er **page ID**.
   Eksempel: `abc123def456ghi789jkl012mno345p`

## 5. Sikkerhed

- `.env` er allerede listet i `.gitignore` og må ikke committes.
- Hvis du kommer til at dele token i chat, bør du straks **reissue** det i Notion.
- Integrationen må kun have adgang til de sider, den skal bruge.

## 6. Test forbindelsen

Når du har indsat værdierne i `.env`, kan du skrive følgende til mig i chatten:

```
Test Notion-forbindelsen.
```

Så kører jeg en test, der bekræfter:
- At token virker
- At root-siden kan læses
- At jeg har de nødvendige rettigheder

## 7. Hvad jeg kan gøre herefter

Når forbindelsen er verificeret, kan jeg:
- Oprette statusboarder (f.eks. Build 2, Backlog, Teststatus)
- Synkronisere testresultater fra PO-acceptancetest
- Opdatere roadmap og backlog automatisk
- Læse og skrive egenskaber i Notion-databaser
