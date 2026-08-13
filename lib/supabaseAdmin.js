import { createClient } from "@supabase/supabase-js";

// Client cu cheia de service (service_role) - are voie sa citeasca/scrie
// orice, ocolind RLS. Se foloseste NUMAI in cod care ruleaza pe server
// (rutele API), niciodata in browser.
let cached = null;

export function supabaseAdmin() {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Lipsesc variabilele de mediu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Vezi .env.example."
    );
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
