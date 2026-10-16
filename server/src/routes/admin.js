import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { ROLES, ISSUE_STATUSES } from "../utils/constants.js";
import { getPriorityIssues } from "../services/statsService.js";
import { updateIssueStatus } from "../services/issueService.js";
import statsRouter from "./stats.js";

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

const priorityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(ISSUE_STATUSES),
  remark: z.string().trim().max(300).optional().nullable(),
});

router.get(
  "/priority",
  validate(priorityQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const issues = await getPriorityIssues(req.query.limit);
    return ok(res, issues);
  })
);

router.use("/stats", statsRouter);

router.patch(
  "/issues/:id/status",
  validate(statusUpdateSchema, "body"),
  asyncHandler(async (req, res) => {
    const updated = await updateIssueStatus({
      issueId: req.params.id,
      newStatus: req.body.status,
      adminId: req.user.id,
      remark: req.body.remark,
    });
    return ok(res, updated);
  })
);

export default router;
