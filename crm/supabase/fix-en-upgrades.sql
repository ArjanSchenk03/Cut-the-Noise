-- =============================================================================
-- CTN-CRM — Fix + upgrades in één keer
-- Draai dit ÉÉNMALIG in de Supabase SQL Editor van project pgexorjdoizwzlpyraiy.
-- Idempotent: veilig om vaker te draaien.
--
-- Bevat:
--   1) FIX: insert-policy op stage_history (anders draait elke fase-wijziging
--      terug met "new row violates row-level security policy")
--   2) Fase 4: recalc_all_grip() — GRIP herberekent bij laden van de pipeline
--   3) Fase 6: due_at/done op activities — deadlines/taken
-- =============================================================================

-- 1) FIX — stage_history mag geschreven worden door de deal-eigenaar/manager
drop policy if exists p_stage_history_insert on stage_history;
create policy p_stage_history_insert on stage_history for insert
  with check (exists (select 1 from deals d where d.id = stage_history.deal_id
                 and (d.owner_id = auth.uid() or current_app_role() in ('manager','admin'))));

-- 2) Fase 4 — GRIP live bij laden
create or replace function recalc_all_grip()
returns setof deals language plpgsql as $$
begin
  update deals set grip_score = calc_grip(id)
   where stage not in ('order_won','verloren')
     and grip_score is distinct from calc_grip(id);
  return query select * from deals where stage <> 'verloren' order by updated_at desc;
end $$;

-- 3) Fase 6 — deadlines op acties
alter table activities
  add column if not exists due_at timestamptz,
  add column if not exists done boolean not null default false;

create index if not exists idx_activities_open_tasks
  on activities (due_at)
  where done = false and due_at is not null;
