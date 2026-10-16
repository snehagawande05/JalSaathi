import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

// Server-only client. Uses the service role key, so never expose it to the client.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
