import { supabase } from "../lib/supabase.js";
import { fail } from "../utils/response.js";

// Verifies the Supabase access token and attaches { id, role } to req.user.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return fail(res, 401, "UNAUTHORIZED", "Sign in to continue.");
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return fail(res, 401, "UNAUTHORIZED", "Your session is invalid or expired.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return fail(res, 403, "FORBIDDEN", "Profile not found.");
    }

    req.user = { id: data.user.id, role: profile.role };
    return next();
  } catch (err) {
    return next(err);
  }
}
