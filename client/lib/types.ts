export type IssueType = "water_interruption" | "pipe_leak" | "drain_blockage" | "dirty_toilet";

export type IssueStatus = "reported" | "verified" | "in_progress" | "resolved" | "rejected";

export type UserRole = "citizen" | "admin";

export type ApiError = { code: string; message: string };

export type ApiResponse<T> = { data: T | null; error: ApiError | null };

export type StatusHistoryItem = {
  id: number;
  old_status: IssueStatus | null;
  new_status: IssueStatus;
  remark: string | null;
  changed_at: string;
  changed_by: string;
};

export type Issue = {
  id: string;
  type: IssueType;
  description: string;
  lat: number;
  lng: number;
  address_text: string | null;
  ward_id: number | null;
  ward_name?: string | null;
  photo_url: string | null;
  status: IssueStatus;
  upvote_count: number;
  created_at: string;
  updated_at?: string;
  resolved_at: string | null;
  upvoted_by_me?: boolean;
  status_history?: StatusHistoryItem[];
};

export type Ward = {
  id: number;
  name: string;
  lat: number | null;
  lng: number | null;
};

export type Hotspot = {
  type: IssueType;
  cluster_id: number;
  recurrence_count: number;
  open_reports: number;
  total_upvotes: number;
  oldest_open_days: number;
  priority_score: number;
  lat: number;
  lng: number;
  radius_m: number;
  ward_id: number;
  ward_name: string;
  issue_ids: string[];
};

export type UserProfile = {
  id: string;
  email?: string;
  role: UserRole;
  full_name: string;
  created_at?: string;
};

export type DuplicateCheckResult = {
  id: string;
  type: IssueType;
  description: string;
  status: IssueStatus;
  upvote_count: number;
  created_at: string;
  lat: number;
  lng: number;
  distance_m: number;
};
