-- =============================================================================
-- CTN-CRM — Upgrade Fase 6 (deadlines op acties)
-- Draai dit ÉÉNMALIG in de Supabase SQL Editor van je EIGEN project.
-- Voegt een deadline (due_at) en afgerond-status (done) toe aan activiteiten,
-- zodat een activiteit een taak-met-deadline kan zijn die op de Acties-pagina
-- verschijnt.
-- =============================================================================

alter table activities
  add column if not exists due_at timestamptz,
  add column if not exists done boolean not null default false;

create index if not exists idx_activities_open_tasks
  on activities (due_at)
  where done = false and due_at is not null;
