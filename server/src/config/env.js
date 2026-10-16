import "dotenv/config";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CLIENT_ORIGIN"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
