import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Faalt vroeg met een duidelijke melding i.p.v. een cryptische fetch-error.
  throw new Error(
    "Ontbrekende Supabase-config. Kopieer .env.example naar .env en vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in (van je EIGEN project, niet Glimp)."
  );
}

// Los getypeerd (geen <Database> generic): de app-laag levert eigen types via casts
// in lib/api.ts. Later te vervangen door gegenereerde types uit `supabase gen types`.
export const supabase = createClient(url, anon);
