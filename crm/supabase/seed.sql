-- Optionele testdata voor de XYZ-CRM.
-- LET OP: draai dit NADAT je bent ingelogd/een user hebt, en zet owner_id op jouw
-- eigen profiel-id. Vind je id via:  select id, full_name from profiles;
-- Vervang hieronder ':OWNER' door dat id (als tekst tussen quotes).

-- \set OWNER '00000000-0000-0000-0000-000000000000'

with owner as (
  -- pak automatisch de eerste profiel als er geen expliciete owner is ingesteld
  select id from profiles order by created_at limit 1
),
acc as (
  insert into accounts (name, industry, source, icp_match, owner_id)
  select v.name, v.industry, 'seed', v.icp, o.id
  from owner o,
       (values
         ('Jansen Logistiek',  'Transport',   80),
         ('De Vries Retail',   'Retail',      65),
         ('Bakker Techniek',   'Industrie',   90)
       ) as v(name, industry, icp)
  returning id, name
)
insert into deals (account_id, title, stage, amount, expected_close_date, grip_score, owner_id)
select a.id,
       a.name || ' — samenwerking',
       v.stage::deal_stage,
       v.amount,
       (now() + (v.days || ' days')::interval)::date,
       v.grip,
       (select id from owner)
from acc a
join (values
        ('Jansen Logistiek', 'afspraak',       12000, 30, 35),
        ('De Vries Retail',  'offerte',         8500, 21, 58),
        ('Bakker Techniek',  'onderhandeling', 24000, 14, 78)
     ) as v(acc_name, stage, amount, days, grip)
  on v.acc_name = a.name;
