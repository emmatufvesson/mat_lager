<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1FU6NMLEy9kePRLmOSTkehL1jpg8RKKW8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Status och nyliga ändringar

- Projektet är nu flyttat så allt ligger direkt i `mat_lager/` (inga underkataloger behövs).
- Supabase används för backend: tabeller och RLS-polices ligger på plats, och appen laddar inventariet via Supabase Realtime.
- En enkel e-post/magic-link-inloggning är aktiverad (Supabase Auth). Inloggning krävs för att lägga till/ta bort varor.
- `Scanner` + “lägg till vara” och borttagning uppdaterar nu Supabase `inventory_items` i stället för `localStorage`.
- Konsumtionsloggar skrivs och läses nu från Supabase (`consumption_logs`) inklusive realtime-uppdatering.
- Ny manuell logg-modal gör det möjligt att lägga till förbrukning utan att gå via matlagningsflödet.

## Snabb överblick för nya utvecklare

- **Repoets syfte:** En matassistent byggd i Vite + React + Tailwind som använder Supabase (Postgres + Auth) och Google Gemini.
- **Autentisering:** Magic-link via Supabase. Sätt `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` och `GEMINI_API_KEY` i `.env.local` innan du kör `npm run dev`.
- **Databas:** Viktiga tabeller: `inventory_items`, `consumption_logs`, `cooking_sessions` (+ *_items), `recipes`, `meal_plan`, `shopping_list`, `profiles`. Se SQL-blocket i repo (Table editor → Run SQL → kör skriptet).
- **Kolumner att dubbelkolla i `consumption_logs`:** `user_id uuid`, `logged_at timestamptz default now()`, `item_name text`, `quantity_used numeric`, `unit text`, `cost numeric`, `reason text`, `dish_name text`, `notes text`.
- **Aktuella bildskärmar:** Lagerlistan, matlagning (drar av varor och loggar konsumtion), ekonomifliken (diagram + loggar), modal för manuell logg.
- **Kända gnistor:** Inga automatiska tester ännu; inga serverless-funktioner deployade; historikvy/meal planning/shopping list orörd.

## Nästa prioriterade steg

1. **Historikvy med redigering** – Bygg `HistoryView` som återanvänder `consumption_logs` och kommande `cooking_sessions` för att visa detaljer och tillåta justeringar.
2. **Matlagningssessioner** – Förfina `CookingView` så att en hel session sparas (med ingrediensrader) och kopplas ihop med loggarna.
3. **README + scripts** – Extrahera Supabase-schema till versionerad SQL-fil och länka här, uppdatera dokumentation när nya tabeller/kolumner tillkommer.
4. **Testning** – Sätt upp Jest + React Testing Library och skriv baslinjetester (auth, lager, loggning).

## Rekommenderade molntjänster och setup

- **Frontend-hosting – Vercel (gratisnivå)**
   - Skapa konto på https://vercel.com.
   - Importera GitHub-repot och behåll projektroten (`.`) som build directory.
   - Under "Environment Variables", lägg in `GEMINI_API_KEY`.
   - Deploya, Vercel bygger Vite automatiskt.

- **Serverless-API & Edge-funktioner – Vercel Functions**
  - I projektet, skapa `api/`-mappar med serverless-handlers (t.ex. `api/cooking.ts`).
  - Använd Vercel CLI (`npm i -g vercel`) för lokal testning (`vercel dev`).
  - Deployen följer med frontend-release.

- **Databas + Auth – Supabase (gratisnivå)**
  - Skapa projekt på https://supabase.com, välj region nära dig.
  - Aktivera Email + Magic Link auth.
   - Skapa tabeller: `inventory_items`, `cooking_sessions`, `cooking_session_items`, `consumption_logs`, `recipes`, `recipe_ingredients`, `meal_plan`, `shopping_list`, `shopping_list_items`, `profiles` (SQL-block finns i repo). 
  - I Supabase dashboard -> Project Settings -> API: kopiera `SUPABASE_URL` och `SUPABASE_ANON_KEY`.
   - Lägg env-variabler i Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) och i lokal `.env.local`.
  - Installera klient: `npm install @supabase/supabase-js`.
  - Skapa `services/supabaseClient.ts`:
    ```ts
    import { createClient } from '@supabase/supabase-js';

    export const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
    ```
  - Använd Supabase Row Level Security + policies för att begränsa data per användare.
   - Slå på Row Level Security för varje tabell:
      1. Gå till Table editor → välj tabell → "Row Level Security" → slå på.
      2. Klicka "Add policy" → välj Template "Enable read access for authenticated users" och ersätt villkoret med `auth.uid() = user_id`.
      3. Skapa separata policies för SELECT, INSERT, UPDATE, DELETE.

- **Autentisering UI – Supabase Auth UI eller Clerk (gratis nivå)**
  - Supabase: `npm install @supabase/auth-ui-react`, rendera `<Auth>`-komponent och lyssna på `supabase.auth.onAuthStateChange`.
  - Clerk (alternativ): konto på https://clerk.com, följ React/Vite-guiden, sätt `CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` i env.

- **AI-tjänst – Google AI Studio (Gemini)**
  - Skapa projekt på https://aistudio.google.com.
  - Aktivera "Billing" (free tier), gå till "API Keys" och skapa ny.
  - Lägg nyckeln i `.env.local` (`GEMINI_API_KEY=`) och i Vercel env vars.
  - `services/geminiService.ts` använder `process.env.GEMINI_API_KEY` via Vite `define`.

- **Inköpsdata – mock + plan för framtid**
  - Inga öppna API:er från Willys/Lidl. För POC:
    - Skapa `services/offersService.ts` som returnerar mockade kampanjer.
    - Lägg TODO-kommentar med options: Matpriskollen API (kräver avtal), Apify-scraper, egna HTML-scrapers hostade på Vercel cron jobs (följ TOS).

- **Monitorering**
  - Slå på Vercel Analytics (gratis) via projektinställningar.
  - Vid behov, använd Logtail eller Axiom (gratisnivå) genom att skicka loggar från serverless functions.

## TODO – Funktioner att implementera

1. **Gemensamt data-/state-lager**
   - Migrera `localStorage` till Supabase-tabeller.
   - Skapa hooks (`useInventory`, `useMealPlan`, `useRecipes`, `useShoppingList`).

2. **Matlagningssession med redigering**
   - Introducera typ `CookingSession` (ingredienser, kvantiteter, kostnadsberäkning).
   - Bygg modal/overlay där användaren kan lägga till/ta bort/ändra mängder innan lager uppdateras.
   - Spara sessionen i Supabase och koppla till `consumption_logs`.

3. **Historikvy med redigering**
   - Skapa ny komponent `HistoryView`.
   - Läs `consumption_logs` + `cooking_session_items`.
   - Tillåt redigering (samma formulär som ovan), skriv tillbaka justeringar och rejustera lager.

4. **Importera lagad rätt till recept**
   - Lägg knapp “Spara som recept” i historikdetalj.
   - Skapa `Recipe` från logg (titel, ingredienser, instruktioner).
   - Spara i `recipes`, koppla `source_log_id` för spårning.

5. **Måltidsplanering**
   - Definiera typ `MealPlanEntry { id, date, mealType, recipeId?, customDish?, notes }`.
   - Skapa vy med kalender/lista framåt.
   - Implementera tre inflöden: välj recept, AI-förslag (via `geminiService`), fri text -> nytt recept.
   - När planerad måltid lagas, erbjud att starta matlagningssession direkt.

6. **Inköpslista med prisoptimering**
   - Samla behov från recept + planering -> `shopping_list`.
   - Hämta erbjudanden (mock initialt) och märk varje artikel med bästa butik.
   - Visa listor per butik + total summering.
   - Lägg till “markera köpt” -> flytta till lager.

7. **Autentisering & multi-user**
   - Integrera Supabase Auth (email magic link) i UI.
   - Säkra serverless endpoints (kontrollera `Authorization: Bearer`-token).

8. **Testning & CI/CD**
   - Lägg till Jest + React Testing Library.
   - Skriv tester för: matlagningsflöde, receptimport, planering->inköp.
   - Aktivera GitHub Actions (lint/test på push, deploy via Vercel). 
