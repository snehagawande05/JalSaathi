import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { ISSUE_TYPES, ISSUE_STATUSES, MAX_PHOTO_BYTES } from "../utils/constants.js";
import {
  getIssues,
  getIssueById,
  checkDuplicate,
  createIssue,
  addUpvote,
  removeUpvote,
} from "../services/issueService.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
});

async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        req.user = { id: data.user.id };
      }
    }
  } catch {
    // Ignore error for optional auth
  }
  next();
}

const listQuerySchema = z.object({
  status: z.enum(ISSUE_STATUSES).optional(),
  type: z.enum(ISSUE_TYPES).optional(),
  ward_id: z.coerce.number().int().positive().optional(),
  bbox: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const checkDuplicateSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  type: z.enum(ISSUE_TYPES),
  radius_m: z.coerce.number().min(10).max(5000).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

const createIssueSchema = z.object({
  type: z.enum(ISSUE_TYPES),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(500),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  address_text: z.string().trim().max(255).optional().nullable(),
});

// GET /api/issues - public list with filters
router.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const issues = await getIssues(req.query);
    return ok(res, issues);
  })
);

// POST /api/issues/check-duplicate - check for nearby open issues
router.post(
  "/check-duplicate",
  validate(checkDuplicateSchema, "body"),
  asyncHandler(async (req, res) => {
    const duplicates = await checkDuplicate({
      lat: req.body.lat,
      lng: req.body.lng,
      type: req.body.type,
      radiusM: req.body.radius_m,
      days: req.body.days,
    });
    return ok(res, duplicates);
  })
);

// POST /api/issues - create new issue (multipart with optional photo)
router.post(
  "/",
  requireAuth,
  upload.single("photo"),
  validate(createIssueSchema, "body"),
  asyncHandler(async (req, res) => {
    const issue = await createIssue({
      reporterId: req.user.id,
      type: req.body.type,
      description: req.body.description,
      lat: req.body.lat,
      lng: req.body.lng,
      addressText: req.body.address_text,
      file: req.file,
    });
    return ok(res, issue, 201);
  })
);

// GET /api/issues/:id - detail with optional auth
router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const issue = await getIssueById(req.params.id, req.user?.id);
    return ok(res, issue);
  })
);

// POST /api/issues/:id/upvote - add upvote
router.post(
  "/:id/upvote",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await addUpvote(req.params.id, req.user.id);
    return ok(res, result);
  })
);

// DELETE /api/issues/:id/upvote - remove upvote
router.delete(
  "/:id/upvote",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await removeUpvote(req.params.id, req.user.id);
    return ok(res, result);
  })
);

export default router;
