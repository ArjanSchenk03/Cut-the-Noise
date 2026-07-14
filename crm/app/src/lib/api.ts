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
  type Profile,
} from "./types";

// ---------- Profiel / rol ----------
export async function getMyProfile(): Promise<Profile | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
  if (error) throw error;
  return data as Profile;
}

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

// Verwijder een deal definitief (cascade wist ook activiteiten en fase-historie).
export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw error;
}

// Verplaats een deal naar een andere fase (trigger logt de overgang in
// stage_history). Fase-gewicht is onderdeel van GRIP, dus meteen herberekenen
// (best effort: bij een fout blijft de oude score staan).
export async function moveDealStage(id: string, stage: DealStage): Promise<Deal> {
  const updated = await updateDeal(id, { stage });
  try {
    const score = await recalcGrip(id);
    return { ...updated, grip_score: score };
  } catch {
    return updated;
  }
}

// Herbereken GRIP voor alle lopende deals server-side en geef de actuele,
// niet-verloren deals terug. Vereist recalc_all_grip() in de database
// (upgrade-fase4.sql); de aanroeper valt terug op listDeals() als die ontbreekt.
export async function recalcAllGrip(): Promise<Deal[]> {
  const { data, error } = await supabase.rpc("recalc_all_grip");
  if (error) throw error;
  return (data ?? []) as Deal[];
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
  due_at?: string | null; // deadline; maakt het een taak op de Acties-pagina
}): Promise<Activity> {
  // due_at alleen meesturen als er een deadline is — zo werkt activiteiten loggen
  // ook als upgrade-fase6.sql (kolom due_at) nog niet is gedraaid.
  const payload: Record<string, unknown> = {
    deal_id: input.deal_id,
    account_id: input.account_id ?? null,
    type: input.type,
    notes: input.notes ?? null,
  };
  if (input.due_at) payload.due_at = input.due_at;

  const { data, error } = await supabase.from("activities").insert(payload).select().single();
  if (error) throw error;
  return data as Activity;
}

export async function setActivityDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from("activities").update({ done }).eq("id", id);
  if (error) throw error;
}

// Open taken (activiteiten met deadline die nog niet afgerond zijn), inclusief
// deal-titel en accountnaam voor weergave op de Acties-pagina.
export interface OpenTask {
  id: string;
  type: ActivityType;
  notes: string | null;
  due_at: string;
  deal_id: string;
  dealTitle: string;
  accountName: string | null;
}

export async function listOpenTasks(): Promise<OpenTask[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("id,type,notes,due_at,deal_id")
    .eq("done", false)
    .not("due_at", "is", null)
    .order("due_at", { ascending: true });
  if (error) throw error;

  const acts = (data ?? []) as {
    id: string;
    type: ActivityType;
    notes: string | null;
    due_at: string;
    deal_id: string | null;
  }[];
  const dealIds = [...new Set(acts.map((a) => a.deal_id).filter(Boolean))] as string[];
  if (dealIds.length === 0) {
    return acts.map((a) => ({ ...a, deal_id: a.deal_id ?? "", dealTitle: "Onbekende deal", accountName: null }));
  }

  // Deal-titels + accountnamen los ophalen (robuuster dan PostgREST-embedding).
  const [{ data: dealsData }, names] = await Promise.all([
    supabase.from("deals").select("id,title,account_id").in("id", dealIds),
    accountNameMap(),
  ]);
  const dealMap = new Map(
    ((dealsData ?? []) as { id: string; title: string; account_id: string }[]).map((d) => [d.id, d])
  );

  return acts.map((a) => {
    const d = a.deal_id ? dealMap.get(a.deal_id) : undefined;
    return {
      id: a.id,
      type: a.type,
      notes: a.notes,
      due_at: a.due_at,
      deal_id: a.deal_id ?? "",
      dealTitle: d?.title ?? "Onbekende deal",
      accountName: d ? names.get(d.account_id) ?? null : null,
    };
  });
}

// Naam-map van alle accounts die je mag zien (voor accountnaam op deal-kaarten).
export async function accountNameMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("accounts").select("id,name");
  if (error) throw error;
  return new Map(((data ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name]));
}

// ---------- CTN-funnelstatistiek (client-side, RLS-veilig) ----------
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

// Zelfde funnelberekening, maar gegroepeerd per verkoper (owner). Alleen zinvol
// voor manager/admin — die zien via RLS alle deals. Sales krijgt enkel de eigen rij.
export interface OwnerFunnel {
  ownerId: string;
  name: string;
  stats: FunnelStats;
}

export async function getTeamFunnelStats(): Promise<OwnerFunnel[]> {
  const [dealsRes, histRes, profRes] = await Promise.all([
    supabase.from("deals").select("id,stage,owner_id"),
    supabase.from("stage_history").select("deal_id,to_stage"),
    supabase.from("profiles").select("id,full_name"),
  ]);
  if (dealsRes.error) throw dealsRes.error;
  if (histRes.error) throw histRes.error;
  if (profRes.error) throw profRes.error;

  const rank = (s: DealStage) => STAGE_RANK[s] ?? 0;
  const ownerOf = new Map<string, string>();
  const maxRank = new Map<string, number>();

  for (const d of (dealsRes.data ?? []) as { id: string; stage: DealStage; owner_id: string }[]) {
    ownerOf.set(d.id, d.owner_id);
    maxRank.set(d.id, Math.max(maxRank.get(d.id) ?? 0, d.stage === "verloren" ? 0 : rank(d.stage)));
  }
  for (const h of (histRes.data ?? []) as { deal_id: string; to_stage: DealStage }[]) {
    if (h.to_stage === "verloren") continue;
    maxRank.set(h.deal_id, Math.max(maxRank.get(h.deal_id) ?? 0, rank(h.to_stage)));
  }

  type Counts = { leads: number; afspraken: number; offertes: number; orders: number };
  const agg = new Map<string, Counts>();
  for (const [dealId, r] of maxRank) {
    const owner = ownerOf.get(dealId);
    if (!owner) continue;
    const c = agg.get(owner) ?? { leads: 0, afspraken: 0, offertes: 0, orders: 0 };
    c.leads++;
    if (r >= STAGE_RANK.afspraak) c.afspraken++;
    if (r >= STAGE_RANK.offerte) c.offertes++;
    if (r >= STAGE_RANK.order_won) c.orders++;
    agg.set(owner, c);
  }

  const names = new Map(
    ((profRes.data ?? []) as { id: string; full_name: string | null }[]).map((p) => [
      p.id,
      p.full_name ?? "Onbekend",
    ])
  );
  const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

  return [...agg.entries()]
    .map(([ownerId, c]) => ({
      ownerId,
      name: names.get(ownerId) ?? "Onbekend",
      stats: {
        ...c,
        x: ratio(c.afspraken, c.leads),
        y: ratio(c.offertes, c.afspraken),
        z: ratio(c.orders, c.offertes),
      } as FunnelStats,
    }))
    .sort((a, b) => b.stats.orders - a.stats.orders);
}
