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

// Minimale Database-typing zodat createClient<Database> tevreden is.
// Uitbreiden zodra de types worden gegenereerd.
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, unknown>;
  };
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
