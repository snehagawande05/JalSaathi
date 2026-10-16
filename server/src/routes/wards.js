import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { getAllWards } from "../services/wardService.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const wards = await getAllWards();
    return ok(res, wards);
  })
);

export default router;
