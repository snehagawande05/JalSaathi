import { supabase } from "../lib/supabase.js";

export async function getStats() {
  const { data, error } = await supabase.rpc("get_stats");
  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "RPC_ERROR";
    throw err;
  }
  return data;
}

export async function getPriorityIssues(limit = 50) {
  const { data, error } = await supabase.rpc("get_priority_issues", {
    p_limit: Number(limit),
  });

  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "RPC_ERROR";
    throw err;
  }

  return data || [];
}
