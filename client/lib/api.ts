import { supabase } from "./supabase";
import type { ApiResponse } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Calls the Express API and attaches the Supabase access token when the user is logged in.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? "Request failed. Try again.");
  }
  return json.data as T;
}
