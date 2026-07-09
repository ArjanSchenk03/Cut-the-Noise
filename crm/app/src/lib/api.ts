// Data-access laag: alle Supabase-queries op één plek.
// owner_id / created_by worden server-side gevuld via de DB-defaults (auth.uid()),
// dus die hoeven we bij insert niet mee te sturen.

import { supabase } from "./supabase";
import {
  STAGE_RANK,
  type Account,
  type Activity,
  type ActivityType,
  type Contact,
  type ContactRole,
  type Deal,
  type DealStage,
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

// ---------- XYZ-funnelstatistiek (client-side, RLS-veilig) ----------
export interface FunnelStats {
  leads: number;
  afspraken: number;
  offertes: number;
  orders: number;
  // Conversieratio's (0..1) of null bij onvoldoende data.
  x: number | null; // afspraken ÷ leads
  y: number | null; // offertes ÷ afspraken
  z: number | null; // orders ÷ offertes
}

// Berekent hoeveel deals elke funnelfase (ooit) bereikten, o.b.v. huidige fase
// én stage_history — zo tellen ook verloren deals mee tot waar ze kwamen.
export async function getFunnelStats(): Promise<FunnelStats> {
  const [dealsRes, histRes] = await Promise.all([
    supabase.from("deals").select("id,stage"),
    supabase.from("stage_history").select("deal_id,to_stage"),
  ]);
  if (dealsRes.error) throw dealsRes.error;
  if (histRes.error) throw histRes.error;

  const rank = (s: DealStage) => STAGE_RANK[s] ?? 0;
  const maxRank = new Map<string, number>();

  for (const d of (dealsRes.data ?? []) as { id: string; stage: DealStage }[]) {
    maxRank.set(d.id, Math.max(maxRank.get(d.id) ?? 0, d.stage === "verloren" ? 0 : rank(d.stage)));
  }
  for (const h of (histRes.data ?? []) as { deal_id: string; to_stage: DealStage }[]) {
    if (h.to_stage === "verloren") continue;
    maxRank.set(h.deal_id, Math.max(maxRank.get(h.deal_id) ?? 0, rank(h.to_stage)));
  }

  let afspraken = 0;
  let offertes = 0;
  let orders = 0;
  for (const r of maxRank.values()) {
    if (r >= STAGE_RANK.afspraak) afspraken++;
    if (r >= STAGE_RANK.offerte) offertes++;
    if (r >= STAGE_RANK.order_won) orders++;
  }
  const leads = maxRank.size;
  const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

  return {
    leads,
    afspraken,
    offertes,
    orders,
    x: ratio(afspraken, leads),
    y: ratio(offertes, afspraken),
    z: ratio(orders, offertes),
  };
}
