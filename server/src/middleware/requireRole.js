import { fail } from "../utils/response.js";

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return fail(res, 403, "FORBIDDEN", "You do not have access to this action.");
    }
    return next();
  };
}
