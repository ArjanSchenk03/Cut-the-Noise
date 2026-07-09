-- =============================================================================
-- XYZ-CRM — Datamodel (Fase 1)
-- Doel: lead-naar-order funnel begeleiden met X/Y/Z-metingen en een GRIP-score.
--
-- ISOLATIE: dit hoort in een EIGEN, NIEUW Supabase-project te draaien.
-- Gebruik NOOIT de database, keys of het project van Glimp. Zo raakt Glimp
-- gegarandeerd niet verstoord (geen gedeelde tabellen/RLS/migraties).
-- =============================================================================

-- Extensies -------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- =============================================================================
-- ENUMS
-- =============================================================================
do $$ begin
  create type deal_stage as enum (
    'lead',           -- prospect geselecteerd
    'afspraak',       -- gesprek gevoerd            (na X)
    'offerte',        -- voorstel besproken         (na Y)
    'onderhandeling', -- laatste horde voor de deal
    'order_won',      -- gewonnen                   (na Z)
    'verloren'        -- afgevallen
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_role as enum ('beslisser', 'beinvloeder', 'gebruiker', 'gatekeeper');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum ('belletje', 'afspraak', 'offerte', 'followup', 'notitie');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('sales', 'manager', 'admin');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- CORE: teams & profielen (profiel = 1-op-1 met auth.users)
-- =============================================================================
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        app_role not null default 'sales',
  team_id     uuid references teams (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Helper: rol van de ingelogde gebruiker (voor RLS, security definer)
create or replace function current_app_role()
returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- =============================================================================
-- ACCOUNTS (de klant-organisatie)
-- =============================================================================
create table if not exists accounts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  industry    text,
  source      text,                         -- lead-bron
  icp_match   int check (icp_match between 0 and 100),  -- hoe goed past dit account
  owner_id    uuid not null references profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_accounts_owner on accounts (owner_id);

-- =============================================================================
-- CONTACTS (personen bij een account)
-- =============================================================================
create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts (id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  role        contact_role,
  created_at  timestamptz not null default now()
);
create index if not exists idx_contacts_account on contacts (account_id);

-- =============================================================================
-- DEALS (één traject door de funnel)
-- =============================================================================
create table if not exists deals (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references accounts (id) on delete cascade,
  title               text not null,
  stage               deal_stage not null default 'lead',
  amount              numeric(12,2) default 0,        -- verwachte orderwaarde
  expected_close_date date,
  grip_score          int default 0 check (grip_score between 0 and 95),
  owner_id            uuid not null references profiles (id) default auth.uid(),
  last_activity_at    timestamptz,                    -- voedt 'versheid' in GRIP
  won_at              timestamptz,
  lost_reason         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_deals_owner on deals (owner_id);
create index if not exists idx_deals_stage on deals (stage);
create index if not exists idx_deals_account on deals (account_id);

-- =============================================================================
-- ACTIVITIES (belletje/afspraak/offerte/followup) — voedt X, Y, Z + versheid
-- =============================================================================
create table if not exists activities (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid references deals (id) on delete cascade,
  account_id  uuid references accounts (id) on delete cascade,
  contact_id  uuid references contacts (id) on delete set null,
  type        activity_type not null,
  occurred_at timestamptz not null default now(),
  notes       text,
  created_by  uuid not null references profiles (id) default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists idx_activities_deal on activities (deal_id);
create index if not exists idx_activities_created_by on activities (created_by);

-- =============================================================================
-- STAGE_HISTORY (elke fase-overgang; basis voor X/Y/Z conversie-analyse)
-- =============================================================================
create table if not exists stage_history (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals (id) on delete cascade,
  from_stage  deal_stage,
  to_stage    deal_stage not null,
  changed_by  uuid references profiles (id) default auth.uid(),
  changed_at  timestamptz not null default now()
);
create index if not exists idx_stage_history_deal on stage_history (deal_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================
-- updated_at bijhouden
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_accounts_updated on accounts;
create trigger trg_accounts_updated before update on accounts
  for each row execute function set_updated_at();

drop trigger if exists trg_deals_updated on deals;
create trigger trg_deals_updated before update on deals
  for each row execute function set_updated_at();

-- Fase-overgang loggen + won_at zetten
create or replace function log_stage_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    insert into stage_history (deal_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
    if new.stage = 'order_won' then new.won_at = now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_deals_stage on deals;
create trigger trg_deals_stage before update on deals
  for each row execute function log_stage_change();

-- last_activity_at op de deal bijwerken bij nieuwe activiteit
create or replace function touch_deal_activity()
returns trigger language plpgsql as $$
begin
  if new.deal_id is not null then
    update deals set last_activity_at = new.occurred_at where id = new.deal_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_activity_touch on activities;
create trigger trg_activity_touch after insert on activities
  for each row execute function touch_deal_activity();

-- =============================================================================
-- GRIP-SCORE  (0–95). Voorstel-formule; verfijn met jullie eigen weging.
--   GRIP = fase-gewicht × versheid × koopsignalen × beslisser-toegang, cap 95
-- =============================================================================
create or replace function calc_grip(p_deal_id uuid)
returns int language plpgsql stable as $$
declare
  d              deals%rowtype;
  base           numeric;      -- fase-gewicht (0..1)
  freshness      numeric;      -- versheid (0..1)
  days_since     numeric;
  has_beslisser  boolean;
  decider        numeric;      -- 0.85 of 1.0
  signals        numeric := 1; -- koopsignalen (placeholder; later uitbreiden)
  score          numeric;
begin
  select * into d from deals where id = p_deal_id;
  if not found then return 0; end if;

  base := case d.stage
            when 'lead'           then 0.10
            when 'afspraak'       then 0.35
            when 'offerte'        then 0.60
            when 'onderhandeling' then 0.80
            when 'order_won'      then 0.95
            else 0 end;

  -- versheid: 1.0 als recent contact, lineair af tot 0.4 na 30 dagen stilte
  days_since := extract(epoch from (now() - coalesce(d.last_activity_at, d.created_at))) / 86400.0;
  freshness  := greatest(0.4, 1 - (days_since / 30.0) * 0.6);

  -- beslisser-toegang: is er een contact met rol 'beslisser' op dit account?
  select exists(
    select 1 from contacts c
    where c.account_id = d.account_id and c.role = 'beslisser'
  ) into has_beslisser;
  decider := case when has_beslisser then 1.0 else 0.85 end;

  score := base * freshness * signals * decider * 100;
  return least(95, greatest(0, round(score)))::int;
end $$;

-- =============================================================================
-- VIEW: XYZ-ratio's per verkoper (afspraak / offerte / order)
--   X = afspraken ÷ leads   |   Y = offertes ÷ afspraken   |   Z = orders ÷ offertes
-- =============================================================================
create or replace view v_xyz_ratios as
with per_owner as (
  select
    owner_id,
    count(*) filter (where stage <> 'verloren')                                  as leads,
    count(*) filter (where stage in ('afspraak','offerte','onderhandeling','order_won')) as afspraken,
    count(*) filter (where stage in ('offerte','onderhandeling','order_won'))    as offertes,
    count(*) filter (where stage = 'order_won')                                  as orders
  from deals
  group by owner_id
)
select
  owner_id,
  leads, afspraken, offertes, orders,
  round(afspraken::numeric / nullif(leads,0),    3) as x_afspraak_ratio,
  round(offertes ::numeric / nullif(afspraken,0),3) as y_offerte_ratio,
  round(orders   ::numeric / nullif(offertes,0), 3) as z_order_ratio
from per_owner;

-- =============================================================================
-- ROW LEVEL SECURITY
--   sales : ziet/bewerkt eigen records
--   manager/admin : ziet alles (voor coaching & rapportage)
-- =============================================================================
alter table teams         enable row level security;
alter table profiles      enable row level security;
alter table accounts      enable row level security;
alter table contacts      enable row level security;
alter table deals         enable row level security;
alter table activities    enable row level security;
alter table stage_history enable row level security;

-- profielen: iedereen leest, alleen jezelf bewerken
drop policy if exists p_profiles_read  on profiles;
drop policy if exists p_profiles_write on profiles;
create policy p_profiles_read  on profiles for select using (true);
create policy p_profiles_write on profiles for update using (id = auth.uid());

-- teams: leesbaar voor ingelogden
drop policy if exists p_teams_read on teams;
create policy p_teams_read on teams for select using (auth.uid() is not null);

-- accounts
drop policy if exists p_accounts_all on accounts;
create policy p_accounts_all on accounts for all
  using (owner_id = auth.uid() or current_app_role() in ('manager','admin'))
  with check (owner_id = auth.uid() or current_app_role() in ('manager','admin'));

-- deals
drop policy if exists p_deals_all on deals;
create policy p_deals_all on deals for all
  using (owner_id = auth.uid() or current_app_role() in ('manager','admin'))
  with check (owner_id = auth.uid() or current_app_role() in ('manager','admin'));

-- contacts (volgt eigenaarschap van het bovenliggende account)
drop policy if exists p_contacts_all on contacts;
create policy p_contacts_all on contacts for all
  using (exists (select 1 from accounts a where a.id = contacts.account_id
                 and (a.owner_id = auth.uid() or current_app_role() in ('manager','admin'))))
  with check (exists (select 1 from accounts a where a.id = contacts.account_id
                 and (a.owner_id = auth.uid() or current_app_role() in ('manager','admin'))));

-- activities
drop policy if exists p_activities_all on activities;
create policy p_activities_all on activities for all
  using (created_by = auth.uid() or current_app_role() in ('manager','admin'))
  with check (created_by = auth.uid() or current_app_role() in ('manager','admin'));

-- stage_history: alleen lezen (schrijven gebeurt via trigger)
drop policy if exists p_stage_history_read on stage_history;
create policy p_stage_history_read on stage_history for select
  using (exists (select 1 from deals d where d.id = stage_history.deal_id
                 and (d.owner_id = auth.uid() or current_app_role() in ('manager','admin'))));

-- =============================================================================
-- Nieuw profiel automatisch aanmaken bij signup
-- =============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

drop trigger if exists trg_auth_new_user on auth.users;
create trigger trg_auth_new_user after insert on auth.users
  for each row execute function handle_new_user();
