# XYZ-CRM — app (frontend)

Vite + React + TypeScript + Tailwind, met Supabase voor auth en data.

## Vereisten

- **Node.js 18+** (nu nog niet geïnstalleerd op deze machine — installeer via
  [nodejs.org](https://nodejs.org) of `winget install OpenJS.NodeJS.LTS`).
- Een **eigen, nieuw** Supabase-project (niet dat van Glimp).

## Eerste keer opstarten

```bash
cd crm/app
npm install
cp .env.example .env       # vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in
npm run dev                # draait op http://localhost:5174
```

## Databaseschema

Zorg dat je het schema hebt geladen: plak `../supabase/schema.sql` in de Supabase
SQL Editor en Run. Maak daarna een testgebruiker aan via **Authentication → Users**.

## Optioneel: testdata

Zie `../supabase/seed.sql` voor een paar voorbeeld-accounts en -deals, zodat de
pipeline niet leeg is. Draai dat als de ingelogde gebruiker owner moet zijn — pas
het `owner_id`-commentaar in dat bestand aan.

## Wat werkt nu (Fase 1b)

- Inloggen / uitloggen (Supabase Auth, e-mail + wachtwoord)
- Beveiligde route: zonder sessie kom je op `/login`
- Pipeline-scherm dat lopende deals per funnelfase toont, met bedrag + GRIP-badge

## Volgende (Fase 2)

- Accounts / contacten / deals aanmaken en bewerken
- Deals tussen fases slepen (drag-and-drop) → schrijft `stage` + logt via trigger
- Activiteiten loggen (belletje/afspraak/offerte/followup)
