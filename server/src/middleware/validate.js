import { fail } from "../utils/response.js";

// Usage: validate(zodSchema, "body" | "query" | "params")
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return fail(res, 400, "VALIDATION_ERROR", message);
    }
    req[source] = result.data;
    return next();
  };
}
