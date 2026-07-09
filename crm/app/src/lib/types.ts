// Handmatige types die het Supabase-schema (crm/supabase/schema.sql) spiegelen.
// Later te vervangen door gegenereerde types: `supabase gen types typescript`.

export type DealStage =
  | "lead"
  | "afspraak"
  | "offerte"
  | "onderhandeling"
  | "order_won"
  | "verloren";

export type ContactRole = "beslisser" | "beinvloeder" | "gebruiker" | "gatekeeper";
export type ActivityType = "belletje" | "afspraak" | "offerte" | "followup" | "notitie";
export type AppRole = "sales" | "manager" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  role: AppRole;
  team_id: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  industry: string | null;
  source: string | null;
  icp_match: number | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  account_id: string;
  title: string;
  stage: DealStage;
  amount: number | null;
  expected_close_date: string | null;
  grip_score: number | null;
  owner_id: string;
  last_activity_at: string | null;
  won_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  account_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: ContactRole | null;
  created_at: string;
}

export interface Activity {
  id: string;
  deal_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  type: ActivityType;
  occurred_at: string;
  due_at: string | null;
  done: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  afspraak: "Afspraak",
  offerte: "Offerte",
  onderhandeling: "Onderhandeling",
  order_won: "Order",
  verloren: "Verloren",
};

// Kolomvolgorde van het kanban-bord (verloren tonen we apart).
export const PIPELINE_STAGES: DealStage[] = [
  "lead",
  "afspraak",
  "offerte",
  "onderhandeling",
  "order_won",
];

// Rangorde van de funnel-fases (voor "heeft minstens fase X bereikt"-tellingen).
export const STAGE_RANK: Record<DealStage, number> = {
  lead: 0,
  afspraak: 1,
  offerte: 2,
  onderhandeling: 3,
  order_won: 4,
  verloren: 0, // een verloren deal telt nog steeds als lead
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  belletje: "Belletje",
  afspraak: "Afspraak",
  offerte: "Offerte",
  followup: "Follow-up",
  notitie: "Notitie",
};

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  beslisser: "Beslisser",
  beinvloeder: "Beïnvloeder",
  gebruiker: "Gebruiker",
  gatekeeper: "Gatekeeper",
};
