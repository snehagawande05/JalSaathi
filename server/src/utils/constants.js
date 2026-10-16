export const ISSUE_TYPES = ["water_interruption", "pipe_leak", "drain_blockage", "dirty_toilet"];

export const ISSUE_STATUSES = ["reported", "verified", "in_progress", "resolved", "rejected"];

export const ROLES = { CITIZEN: "citizen", ADMIN: "admin" };

export const HOTSPOT_DEFAULTS = { days: 30, minReports: 3, radiusM: 200 };

export const DUPLICATE_DEFAULTS = { radiusM: 50, days: 7 };

export const MAX_REPORTS_PER_DAY = 5;

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
