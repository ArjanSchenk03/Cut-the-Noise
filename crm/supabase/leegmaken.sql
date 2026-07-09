-- =============================================================================
-- CTN-CRM — Testdata opschonen
-- Verwijdert ALLE accounts, contacten, deals, activiteiten en fase-historie.
-- BEHOUDT je gebruikers/logins (profiles) en teams.
--
-- LET OP: dit is definitief en kan niet ongedaan gemaakt worden.
-- Draai in de Supabase SQL Editor van project pgexorjdoizwzlpyraiy.
-- =============================================================================

truncate table stage_history, activities, deals, contacts, accounts
  restart identity cascade;
