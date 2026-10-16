import type { IssueStatus, IssueType } from "./types";

export const NAGPUR_CENTER = { lat: 21.1458, lng: 79.0882, zoom: 12 };

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  water_interruption: "Water interruption",
  pipe_leak: "Pipe leak",
  drain_blockage: "Drain blockage",
  dirty_toilet: "Dirty toilet",
};

export const STATUS_META: Record<IssueStatus, { label: string; color: string; badge: string }> = {
  reported: { label: "Reported", color: "#EF4444", badge: "bg-[#FEE2E2] text-[#991B1B]" },
  verified: { label: "Verified", color: "#F59E0B", badge: "bg-[#FEF3C7] text-[#92400E]" },
  in_progress: { label: "In progress", color: "#3B82F6", badge: "bg-[#DBEAFE] text-[#1E40AF]" },
  resolved: { label: "Resolved", color: "#10B981", badge: "bg-[#D1FAE5] text-[#065F46]" },
  rejected: { label: "Rejected", color: "#64748B", badge: "bg-[#E2E8F0] text-[#334155]" },
};
