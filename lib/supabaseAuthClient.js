import { createClient } from "@supabase/supabase-js";

// Client cu cheia publica (anon) - folosit STRICT ca sa verificam
// email+parola la login (supabase.auth.signInWithPassword). Nu se foloseste
// pentru citit/scris date - de asta se ocupa supabaseAdmin, prin rutele API.
export function supabaseAuthClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Lipsesc variabilele de mediu SUPABASE_URL / SUPABASE_ANON_KEY. Vezi .env.example."
    );
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
