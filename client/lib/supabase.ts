import { createClient } from "@supabase/supabase-js";

// Browser client. Used for authentication only; data goes through the Express API.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing-anon-key",
);
