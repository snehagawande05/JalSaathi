import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { code: "RATE_LIMITED", message: "Too many requests. Try again soon." } },
});
