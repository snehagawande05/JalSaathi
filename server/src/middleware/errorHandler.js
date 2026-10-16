import { fail } from "../utils/response.js";

export function notFound(req, res) {
  return fail(res, 404, "NOT_FOUND", "Route not found.");
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  if (status >= 500) {
    console.error(err);
    return fail(res, 500, "INTERNAL_ERROR", "Something went wrong. Try again.");
  }
  const code = typeof err.code === "string" ? err.code : "BAD_REQUEST";
  return fail(res, status, code, err.message);
}
