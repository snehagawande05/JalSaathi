import { supabase } from "../lib/supabase.js";
import { parsePointEwkb, toPointWkt } from "../utils/geo.js";
import { getPhotoPublicUrl, uploadPhoto } from "./storageService.js";
import { MAX_REPORTS_PER_DAY } from "../utils/constants.js";

function formatIssue(row) {
  if (!row) return null;
  const coords = parsePointEwkb(row.location);
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    address_text: row.address_text ?? null,
    ward_id: row.ward_id ?? null,
    ward_name: row.wards?.name ?? null,
    photo_url: getPhotoPublicUrl(row.photo_path),
    status: row.status,
    upvote_count: row.upvote_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_at: row.resolved_at ?? null,
  };
}

export async function getIssues({
  status,
  type,
  ward_id,
  bbox,
  limit = 50,
  offset = 0,
} = {}) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const numOffset = Math.max(Number(offset) || 0, 0);

  let query = supabase
    .from("issues")
    .select(`
      id,
      type,
      description,
      location,
      address_text,
      ward_id,
      photo_path,
      status,
      upvote_count,
      created_at,
      updated_at,
      resolved_at,
      wards ( id, name )
    `);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (ward_id) query = query.eq("ward_id", Number(ward_id));

  query = query
    .order("created_at", { ascending: false })
    .range(numOffset, numOffset + cappedLimit - 1);

  const { data, error } = await query;
  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  let formatted = (data || []).map(formatIssue);

  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      formatted = formatted.filter(
        (issue) =>
          issue.lng !== null &&
          issue.lat !== null &&
          issue.lng >= minLng &&
          issue.lng <= maxLng &&
          issue.lat >= minLat &&
          issue.lat <= maxLat
      );
    }
  }

  return formatted;
}

export async function getIssueById(id, currentUserId = null) {
  const { data: issue, error } = await supabase
    .from("issues")
    .select(`
      id,
      type,
      description,
      location,
      address_text,
      ward_id,
      photo_path,
      status,
      upvote_count,
      created_at,
      updated_at,
      resolved_at,
      wards ( id, name )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  if (!issue) {
    const err = new Error("Issue not found");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const { data: history, error: historyError } = await supabase
    .from("status_history")
    .select("id, old_status, new_status, remark, changed_at, profiles ( full_name, role )")
    .eq("issue_id", id)
    .order("changed_at", { ascending: true });

  if (historyError) {
    const err = new Error(historyError.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  let upvotedByMe = false;
  if (currentUserId) {
    const { data: upvote } = await supabase
      .from("upvotes")
      .select("issue_id")
      .eq("issue_id", id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    upvotedByMe = Boolean(upvote);
  }

  const base = formatIssue(issue);
  return {
    ...base,
    upvoted_by_me: upvotedByMe,
    status_history: (history || []).map((h) => ({
      id: h.id,
      old_status: h.old_status,
      new_status: h.new_status,
      remark: h.remark,
      changed_at: h.changed_at,
      changed_by: h.profiles?.role === "admin" ? "Municipal Admin" : "Citizen",
    })),
  };
}

export async function checkDuplicate({ lat, lng, type, radiusM = 50, days = 7 }) {
  const { data, error } = await supabase.rpc("check_duplicate", {
    p_lat: Number(lat),
    p_lng: Number(lng),
    p_type: type,
    p_radius_m: Number(radiusM),
    p_days: Number(days),
  });

  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "RPC_ERROR";
    throw err;
  }

  return data || [];
}

export async function createIssue({
  reporterId,
  type,
  description,
  lat,
  lng,
  addressText = null,
  file = null,
}) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("issues")
    .select("*", { count: "exact", head: true })
    .eq("reporter_id", reporterId)
    .gte("created_at", oneDayAgo);

  if (countError) {
    const err = new Error(countError.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  if (typeof count === "number" && count >= MAX_REPORTS_PER_DAY) {
    const err = new Error(
      `Daily report limit reached (maximum ${MAX_REPORTS_PER_DAY} reports per day).`
    );
    err.status = 429;
    err.code = "RATE_LIMIT_EXCEEDED";
    throw err;
  }

  let wardId = null;
  const { data: assignedWard, error: wardError } = await supabase.rpc("assign_ward", {
    p_lat: Number(lat),
    p_lng: Number(lng),
  });
  if (!wardError && assignedWard) {
    wardId = assignedWard;
  }

  let photoPath = null;
  if (file) {
    photoPath = await uploadPhoto(file, reporterId);
  }

  const { data: newIssue, error: insertError } = await supabase
    .from("issues")
    .insert({
      reporter_id: reporterId,
      type,
      description,
      location: toPointWkt(lng, lat),
      address_text: addressText || null,
      ward_id: wardId,
      photo_path: photoPath,
      status: "reported",
    })
    .select(`
      id,
      type,
      description,
      location,
      address_text,
      ward_id,
      photo_path,
      status,
      upvote_count,
      created_at,
      updated_at,
      resolved_at,
      wards ( id, name )
    `)
    .single();

  if (insertError) {
    const err = new Error(insertError.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  await supabase.from("status_history").insert({
    issue_id: newIssue.id,
    old_status: null,
    new_status: "reported",
    changed_by: reporterId,
    remark: "Issue reported by citizen.",
  });

  return formatIssue(newIssue);
}

export async function addUpvote(issueId, userId) {
  const { error } = await supabase
    .from("upvotes")
    .insert({ issue_id: issueId, user_id: userId });

  if (error) {
    if (error.code === "23505") {
      const err = new Error("You have already upvoted this issue.");
      err.status = 409;
      err.code = "ALREADY_UPVOTED";
      throw err;
    }
    if (error.code === "23503") {
      const err = new Error("Issue not found.");
      err.status = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    const err = new Error(error.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  const { data: issue } = await supabase
    .from("issues")
    .select("upvote_count")
    .eq("id", issueId)
    .single();

  return { upvoted: true, upvote_count: issue?.upvote_count ?? 1 };
}

export async function removeUpvote(issueId, userId) {
  const { error } = await supabase
    .from("upvotes")
    .delete()
    .eq("issue_id", issueId)
    .eq("user_id", userId);

  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  const { data: issue } = await supabase
    .from("issues")
    .select("upvote_count")
    .eq("id", issueId)
    .single();

  return { upvoted: false, upvote_count: issue?.upvote_count ?? 0 };
}

export async function updateIssueStatus({ issueId, newStatus, adminId, remark = null }) {
  const { data, error } = await supabase.rpc("change_issue_status", {
    p_issue_id: issueId,
    p_new_status: newStatus,
    p_admin_id: adminId,
    p_remark: remark || null,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("FORBIDDEN")) {
      const err = new Error(msg);
      err.status = 403;
      err.code = "FORBIDDEN";
      throw err;
    }
    if (msg.includes("NOT_FOUND")) {
      const err = new Error(msg);
      err.status = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    if (msg.includes("INVALID_TRANSITION")) {
      const err = new Error(msg);
      err.status = 409;
      err.code = "INVALID_TRANSITION";
      throw err;
    }
    const err = new Error(error.message);
    err.status = 500;
    err.code = "STATUS_UPDATE_ERROR";
    throw err;
  }

  return formatIssue(data);
}

export async function getUserIssues(userId) {
  const { data, error } = await supabase
    .from("issues")
    .select(`
      id,
      type,
      description,
      location,
      address_text,
      ward_id,
      photo_path,
      status,
      upvote_count,
      created_at,
      updated_at,
      resolved_at,
      wards ( id, name )
    `)
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    const err = new Error(error.message);
    err.status = 500;
    err.code = "DATABASE_ERROR";
    throw err;
  }

  return (data || []).map(formatIssue);
}
