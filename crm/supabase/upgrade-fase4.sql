-- =============================================================================
-- XYZ-CRM — Upgrade Fase 4 (GRIP live + actielijst)
-- Draai dit ÉÉNMALIG in de Supabase SQL Editor van je EIGEN project.
-- (Verse installaties hebben dit al: schema.sql bevat deze functie ook.)
-- =============================================================================

-- Herbereken GRIP voor alle lopende deals en geef de actuele, niet-verloren
-- deals terug. De app roept dit aan bij het laden van de pipeline, zodat
-- scores altijd vers zijn. RLS bepaalt welke deals je ziet/bijwerkt
-- (security invoker), dus sales raakt alleen eigen deals.
create or replace function recalc_all_grip()
returns setof deals
language plpgsql as $$
begin
  update deals
     set grip_score = calc_grip(id)
   where stage not in ('order_won', 'verloren')
     and grip_score is distinct from calc_grip(id);  -- alleen echte wijzigingen

  return query
  select * from deals where stage <> 'verloren' order by updated_at desc;
end $$;
