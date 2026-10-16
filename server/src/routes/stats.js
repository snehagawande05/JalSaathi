import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { getStats } from "../services/statsService.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const stats = await getStats();
    return ok(res, stats);
  })
);

export default router;
