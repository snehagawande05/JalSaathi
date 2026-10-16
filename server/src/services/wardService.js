import { supabase } from "../lib/supabase.js";
import { parsePointEwkb } from "../utils/geo.js";

export async function getAllWards() {
  const { data, error } = await supabase
    .from("wards")
    .select("id, name, center")
    .order("name");

  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  return (data || []).map((w) => {
    const coords = parsePointEwkb(w.center);
    return {
      id: w.id,
      name: w.name,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };
  });
}
