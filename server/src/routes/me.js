import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { getUserIssues } from "../services/issueService.js";
import { supabase } from "../lib/supabase.js";

const router = Router();

// GET /api/me - get current user profile & role
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("id", req.user.id)
      .single();

    return ok(res, {
      id: req.user.id,
      role: req.user.role,
      full_name: profile?.full_name || "",
      created_at: profile?.created_at,
    });
  })
);

// GET /api/me/issues - get own reported issues
router.get(
  "/issues",
  requireAuth,
  asyncHandler(async (req, res) => {
    const issues = await getUserIssues(req.user.id);
    return ok(res, issues);
  })
);

export default router;
