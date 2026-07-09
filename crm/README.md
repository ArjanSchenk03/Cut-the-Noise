# XYZ-CRM

Een eigen CRM om de verkoopfunnel **lead → order** te begeleiden, geïnspireerd op de
XYZ-formule®-methodiek (afspraak → offerte → order) met een **GRIP-score** per account.

> Dit is een **eigen bouw** — geen kopie van externe software.

## ⚠️ Isolatie t.o.v. Glimp (harde eis)

Deze CRM staat **technisch volledig los** van Glimp:

- **Eigen Supabase-project.** Maak een nieuw project aan; hergebruik nooit de
  database, keys of het project van Glimp. Geen gedeelde tabellen, geen gedeelde RLS.
- **Eigen map.** Alle CRM-code leeft onder `crm/`. De bestaande `../index.html`
  (Cut-the-Noise marketingsite) en Glimp worden niet aangeraakt.
- **Eigen domein/subdomein** bij deployment (bv. `crm.<domein>`).

Zolang je bij deze drie punten blijft, kan de CRM Glimp onmogelijk verstoren.

## Datamodel (Fase 1 — klaar)

Zie [`supabase/schema.sql`](supabase/schema.sql). Kern:

```
teams ─< profiles (= auth.users)
                │ owner
                ▼
accounts ─< contacts
   │
   └─< deals ─< activities        (belletje/afspraak/offerte/followup → voeden X/Y/Z)
         └─< stage_history         (elke fase-overgang → conversie-analyse)
```

**Funnel-fases (`deal_stage`):** `lead → afspraak → offerte → onderhandeling → order_won` (+ `verloren`).

**X/Y/Z** = de drie conversie-overgangen, berekend in de view `v_xyz_ratios`:
- **X** = afspraken ÷ leads
- **Y** = offertes ÷ afspraken
- **Z** = orders ÷ offertes

**GRIP-score** (0–95) per deal via `calc_grip(deal_id)`:
`fase-gewicht × versheid × koopsignalen × beslisser-toegang`.

## Setup (nieuw Supabase-project)

1. Maak een **nieuw** project op [supabase.com](https://supabase.com) (níét dat van Glimp).
2. Open **SQL Editor** → plak de inhoud van `supabase/schema.sql` → **Run**.
3. Kopieer `Project URL` + `anon key` naar `crm/app/.env` (komt in Fase 1b).
4. Maak een testgebruiker aan via **Authentication → Users**.

## Roadmap

- [x] **Fase 1** — Datamodel + schema + RLS
- [ ] **Fase 1b** — App-scaffold (Vite + React + TS + Tailwind) + login
- [ ] **Fase 2** — Pipeline (kanban), accounts/contacten/deals CRUD, activiteiten loggen
- [ ] **Fase 3** — XYZ-dashboard + terugreken-calculator
- [ ] **Fase 4** — GRIP-score live (kleurcodering + actielijst)
- [ ] **Fase 5** — Coaching- & team-rapportage
