import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Faalt vroeg met een duidelijke melding i.p.v. een cryptische fetch-error.
  throw new Error(
    "Ontbrekende Supabase-config. Kopieer .env.example naar .env en vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in (van je EIGEN project, niet Glimp)."
  );
}

export const supabase = createClient<Database>(url, anon);
