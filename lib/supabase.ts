import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  // Prefer service role key if available (safer for server-side operations)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY må settes på serveren");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
