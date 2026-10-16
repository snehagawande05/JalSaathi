import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { getHotspots } from "../services/hotspotService.js";

const router = Router();

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
  min_reports: z.coerce.number().int().min(2).max(50).optional(),
  radius_m: z.coerce.number().min(10).max(5000).optional(),
});

router.get(
  "/",
  validate(querySchema, "query"),
  asyncHandler(async (req, res) => {
    const { days, min_reports, radius_m } = req.query;
    const hotspots = await getHotspots({
      days,
      minReports: min_reports,
      radiusM: radius_m,
    });
    return ok(res, hotspots);
  })
);

export default router;
