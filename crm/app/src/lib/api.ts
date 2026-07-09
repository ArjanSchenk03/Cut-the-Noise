// Data-access laag: alle Supabase-queries op één plek.
// owner_id / created_by worden server-side gevuld via de DB-defaults (auth.uid()),
// dus die hoeven we bij insert niet mee te sturen.

import { supabase } from "./supabase";
import type {
  Account,
  Activity,
  ActivityType,
  Contact,
  ContactRole,
  Deal,
  DealStage,
} from "./types";

// ---------- Accounts ----------
export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Account[];
}

export async function getAccount(id: string): Promise<Account | null> {
  const { data, error } = await supabase.from("accounts").select("*").eq("id", id).single();
  if (error) throw error;
  return (data as Account) ?? null;
}

export async function createAccount(input: {
  name: string;
  industry?: string | null;
  source?: string | null;
  icp_match?: number | null;
}): Promise<Account> {
  const { data, error } = await supabase.from("accounts").insert(input).select().single();
  if (error) throw error;
  return data as Account;
}

// ---------- Contacts ----------
export async function listContacts(accountId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function createContact(input: {
  account_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: ContactRole | null;
}): Promise<Contact> {
  const { data, error } = await supabase.from("contacts").insert(input).select().single();
  if (error) throw error;
  return data as Contact;
}

// ---------- Deals ----------
export async function listDeals(opts?: { includeLost?: boolean }): Promise<Deal[]> {
  let q = supabase.from("deals").select("*").order("updated_at", { ascending: false });
  if (!opts?.includeLost) q = q.neq("stage", "verloren");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Deal[];
}

export async function listDealsForAccount(accountId: string): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Deal[];
}

export async function createDeal(input: {
  account_id: string;
  title: string;
  amount?: number | null;
  expected_close_date?: string | null;
  stage?: DealStage;
}): Promise<Deal> {
  const { data, error } = await supabase.from("deals").insert(input).select().single();
  if (error) throw error;
  return data as Deal;
}

export async function updateDeal(
  id: string,
  patch: Partial<Pick<Deal, "stage" | "amount" | "expected_close_date" | "title" | "lost_reason">>
): Promise<Deal> {
  const { data, error } = await supabase.from("deals").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Deal;
}

// Verplaats een deal naar een andere fase (trigger logt de overgang in stage_history).
export async function moveDealStage(id: string, stage: DealStage): Promise<Deal> {
  return updateDeal(id, { stage });
}

// Herbereken de GRIP-score in de database en sla hem op de deal op.
export async function recalcGrip(id: string): Promise<number> {
  const { data, error } = await supabase.rpc("calc_grip", { p_deal_id: id });
  if (error) throw error;
  const score = (data as number) ?? 0;
  await supabase.from("deals").update({ grip_score: score }).eq("id", id);
  return score;
}

// ---------- Activities ----------
export async function listActivities(dealId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function createActivity(input: {
  deal_id: string;
  account_id?: string | null;
  type: ActivityType;
  notes?: string | null;
}): Promise<Activity> {
  const { data, error } = await supabase.from("activities").insert(input).select().single();
  if (error) throw error;
  return data as Activity;
}
