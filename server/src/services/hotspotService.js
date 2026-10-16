import { supabase } from "../lib/supabase.js";
import { HOTSPOT_DEFAULTS } from "../utils/constants.js";

export async function getHotspots({
  days = HOTSPOT_DEFAULTS.days,
  minReports = HOTSPOT_DEFAULTS.minReports,
  radiusM = HOTSPOT_DEFAULTS.radiusM,
} = {}) {
  const { data, error } = await supabase.rpc("get_hotspots", {
    p_days: Number(days),
    p_min_reports: Number(minReports),
    p_radius_m: Number(radiusM),
  });

  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "RPC_ERROR";
    throw err;
  }

  return data || [];
}
