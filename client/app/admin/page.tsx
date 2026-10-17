"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Flame,
  ListOrdered,
  BarChart3,
  Users,
  Building2,
  Settings,
  Search,
  Bell,
  RefreshCw,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Loader2,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  ArrowUpRight,
  UserCheck,
  Phone,
  Mail,
  Shield,
  Layers,
  Sparkles,
  ChevronRight,
  X,
  FileSpreadsheet,
  Printer,
  Sliders,
  Check,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { apiFetch } from "@/lib/api";
import { ISSUE_TYPE_LABELS, STATUS_META, NAGPUR_CENTER } from "@/lib/constants";
import type { Issue, Hotspot, Ward, IssueType, IssueStatus } from "@/lib/types";

// Dynamic map to avoid SSR window issues
const MapViewer = dynamic(() => import("@/components/map/MapViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-medium">
      <Loader2 className="h-5 w-5 animate-spin mr-2 text-cyan-600" />
      Loading Nagpur map view...
    </div>
  ),
});

interface PriorityIssue {
  id: string;
  type: string;
  description: string;
  status: string;
  upvote_count: number;
  ward_id: number;
  ward_name: string;
  lat: number;
  lng: number;
  created_at: string;
  days_open: number;
  hotspot_recurrence: number;
  upvote_points: number;
  age_points: number;
  hotspot_points: number;
  priority_score: number;
}

interface StatsData {
  total: number;
  open: number;
  resolved: number;
  rejected: number;
  avg_resolution_hours: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_ward: { ward_id: number; ward_name: string; total: number; open: number; resolved: number }[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "citizen" | "engineer";
  reports: number;
  status: "Active" | "Inactive";
}

export default function AdminPortalPage() {
  const { user, loading: authLoading, quickLogin, logout } = useAuth();

  // Navigation tab state (8 screens matching design mockup)
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "issues" | "hotspots" | "priority" | "reports" | "users" | "wards" | "settings"
  >("dashboard");

  // Global search input in header
  const [globalSearch, setGlobalSearch] = useState("");

  // Data states
  const [stats, setStats] = useState<StatsData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [priorityIssues, setPriorityIssues] = useState<PriorityIssue[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);

  // Status update modal state
  const [selectedIssue, setSelectedIssue] = useState<Issue | PriorityIssue | null>(null);
  const [newStatus, setNewStatus] = useState<string>("verified");
  const [remark, setRemark] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Civic status machine allowed transitions
  const ALLOWED_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
    reported: [
      { value: "verified", label: "Verified (Inspected by field agent)" },
      { value: "rejected", label: "Rejected (Duplicate or invalid)" },
    ],
    verified: [
      { value: "in_progress", label: "In Progress (Work crew dispatched)" },
      { value: "rejected", label: "Rejected (Duplicate or invalid)" },
    ],
    in_progress: [
      { value: "resolved", label: "Resolved (Repaired & closed on site)" },
    ],
    resolved: [],
    rejected: [],
  };

  const openStatusModal = (issueItem: Issue | PriorityIssue) => {
    setSelectedIssue(issueItem);
    setUpdateError(null);
    setRemark("");
    const options = ALLOWED_TRANSITIONS[issueItem.status] || [];
    if (options.length > 0) {
      setNewStatus(options[0].value);
    } else {
      setNewStatus("");
    }
  };

  // Assign Engineer Modal
  const [assignIssue, setAssignIssue] = useState<PriorityIssue | null>(null);
  const [assignedEngineer, setAssignedEngineer] = useState("Er. Rajesh Sharma (Ward 3)");
  const [slaTargetDays, setSlaTargetDays] = useState("2");

  // Tab 2: Issues Filters
  const [issueSearch, setIssueSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWard, setFilterWard] = useState<string>("all");
  const [issuePage, setIssuePage] = useState(1);

  // Tab 3: Hotspots Filter Controls
  const [hotspotFilterType, setHotspotFilterType] = useState<string>("all");
  const [hotspotMinReports, setHotspotMinReports] = useState<number>(3);
  const [hotspotRadius, setHotspotRadius] = useState<number>(200);

  // Tab 6: Users state
  const [usersList, setUsersList] = useState<AdminUser[]>([
    { id: "1", name: "Rohan Gupta", email: "admin@jalsaathi.demo", role: "admin", reports: 12, status: "Active" },
    { id: "2", name: "Rahul Sharma", email: "citizen1@jalsaathi.demo", role: "citizen", reports: 5, status: "Active" },
    { id: "3", name: "Priya Desai", email: "citizen2@jalsaathi.demo", role: "citizen", reports: 3, status: "Active" },
    { id: "4", name: "Amit Verma", email: "citizen3@jalsaathi.demo", role: "citizen", reports: 7, status: "Active" },
    { id: "5", name: "Er. Rajesh Sharma", email: "rajesh.eng@nmc.gov.in", role: "engineer", reports: 0, status: "Active" },
    { id: "6", name: "Er. Sunita Patil", email: "sunita.eng@nmc.gov.in", role: "engineer", reports: 0, status: "Active" },
    { id: "7", name: "Sneha Pant", email: "sneha@demo.com", role: "citizen", reports: 2, status: "Active" },
    { id: "8", name: "Pooja Nair", email: "pooja@demo.com", role: "citizen", reports: 1, status: "Inactive" },
  ]);
  const [userSearch, setUserSearch] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"citizen" | "engineer" | "admin">("citizen");

  // Tab 8: Settings states
  const [notifReports, setNotifReports] = useState(true);
  const [notifStatus, setNotifStatus] = useState(true);
  const [notifHotspots, setNotifHotspots] = useState(true);
  const [notifSummary, setNotifSummary] = useState(false);
  const [allowCitizenComments, setAllowCitizenComments] = useState(true);

  // Load all data
  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, priorityData, hotspotsData, issuesData, wardsData] = await Promise.all([
        apiFetch<StatsData>("/api/admin/stats"),
        apiFetch<PriorityIssue[]>("/api/admin/priority?limit=30"),
        apiFetch<Hotspot[]>("/api/hotspots"),
        apiFetch<Issue[]>("/api/issues?limit=100"),
        apiFetch<Ward[]>("/api/wards"),
      ]);
      setStats(statsData);
      setPriorityIssues(priorityData || []);
      setHotspots(hotspotsData || []);
      setIssues(issuesData || []);
      setWards(wardsData || []);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle status update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !newStatus) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await apiFetch(`/api/admin/issues/${selectedIssue.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          remark: remark.trim() || undefined,
        }),
      });
      setSelectedIssue(null);
      setRemark("");
      setToastMessage("Issue status updated successfully!");
      setTimeout(() => setToastMessage(null), 3000);
      await loadAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status";
      setUpdateError(msg);
    } finally {
      setUpdating(false);
    }
  };

  // Export CSV helper
  const handleExportCSV = () => {
    const headers = ["ID", "Type", "Ward", "Status", "Upvotes", "Created_At", "Description"];
    const rows = issues.map((i) => [
      i.id,
      i.type,
      i.ward_name || i.ward_id,
      i.status,
      i.upvote_count,
      i.created_at,
      `"${(i.description || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jalsaathi_civic_reports_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered issues for Tab 2
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filterType !== "all" && issue.type !== filterType) return false;
      if (filterStatus !== "all" && issue.status !== filterStatus) return false;
      if (filterWard !== "all" && String(issue.ward_id) !== filterWard) return false;
      if (issueSearch.trim()) {
        const q = issueSearch.toLowerCase();
        const matchesDesc = issue.description?.toLowerCase().includes(q);
        const matchesLoc = issue.address_text?.toLowerCase().includes(q);
        const matchesType = issue.type?.toLowerCase().includes(q);
        const matchesId = issue.id?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesLoc && !matchesType && !matchesId) return false;
      }
      return true;
    });
  }, [issues, filterType, filterStatus, filterWard, issueSearch]);

  // Paginated issues
  const pageSize = 8;
  const totalPages = Math.ceil(filteredIssues.length / pageSize) || 1;
  const paginatedIssues = filteredIssues.slice((issuePage - 1) * pageSize, issuePage * pageSize);

  // Filtered hotspots for Tab 3
  const filteredHotspots = useMemo(() => {
    return hotspots.filter((h) => {
      if (hotspotFilterType !== "all" && h.type !== hotspotFilterType) return false;
      if (h.recurrence_count < hotspotMinReports) return false;
      return true;
    });
  }, [hotspots, hotspotFilterType, hotspotMinReports]);

  // Filtered users for Tab 6
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [usersList, userSearch]);

  if (authLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mx-auto" />
      </div>
    );
  }

  // Role Guard
  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Admin Authorization Required</h2>
          <p className="text-xs text-slate-500">
            This dashboard is restricted to Municipal Administrators and Ward Engineers to manage priority queues and resolution.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => quickLogin("admin")}
              className="w-full rounded-xl bg-cyan-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-cyan-800 transition"
            >
              ⚡ 1-Click Login as Demo Admin
            </button>
            <Link
              href="/"
              className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Return to Citizen Platform
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Admin Portal Container — full-bleed standalone web portal */}
      <div className="w-full min-h-screen bg-slate-100/60 flex flex-col lg:flex-row">
        {/* ── LEFT SIDEBAR NAVIGATION ── */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 lg:min-h-screen lg:sticky lg:top-0">
          <div>
            {/* Logo Brand */}
            <div className="p-5 border-b border-slate-200/80 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-xs">
                <svg viewBox="0 0 120 140" className="w-5 h-5" fill="none">
                  <path
                    d="M60 12 C60 12 18 68 18 92 C18 116 38 132 60 132 C82 132 102 116 102 92 C102 68 60 12 60 12Z"
                    fill="white"
                  />
                  <path
                    d="M60 58 C60 58 78 72 78 90 C78 104 70 114 60 118 C62 98 56 84 44 74 C50 66 60 58 60 58Z"
                    fill="#10b981"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">JalSaathi</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Admin Portal</span>
              </div>
            </div>

            {/* Nav Menu Items (8 Screens matching mockup) */}
            <nav className="p-3 space-y-1">
              {[
                { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { id: "issues", label: "Issues", icon: ClipboardList, badge: issues.length },
                { id: "hotspots", label: "Hotspots", icon: Flame, badge: hotspots.length },
                { id: "priority", label: "Priority List", icon: ListOrdered },
                { id: "reports", label: "Reports", icon: BarChart3 },
                { id: "users", label: "Users", icon: Users },
                { id: "wards", label: "Wards", icon: Building2 },
                { id: "settings", label: "Settings", icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as typeof activeTab)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-cyan-700 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer info */}
          <div className="p-4 border-t border-slate-200/80 bg-slate-50/70">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Nagpur Municipal Net</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT MAIN CONTENT AREA ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Bar */}
          <header className="px-6 py-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-30">
            {/* Global Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search issues, locations, wards..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Notification & User Profile */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                title="View Public Citizen Website"
              >
                <span>🌐 Public Site</span>
              </Link>

              <button
                onClick={loadAdminData}
                disabled={loading}
                title="Refresh Live Data"
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-600" : ""}`} />
              </button>

              <button className="relative p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                <Bell className="h-3.5 w-3.5" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-700 text-white font-bold text-xs shadow-xs">
                  {user.full_name?.charAt(0) || "A"}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-bold text-slate-900">{user.full_name || "Admin"}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Administrator</p>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          {/* Dynamic Tab Body */}
          <main className="p-6 bg-slate-50/40 flex-1 overflow-y-auto">
            {/* ═══════════════════════════════════════════════════════════════
                SCREEN 1: DASHBOARD
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Title + Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-xs text-slate-500">
                      Welcome back, Admin! Here&apos;s what&apos;s happening across Nagpur today.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                    📅 Last 30 days
                  </span>
                </div>

                {/* 4 Key Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                    <p className="text-xs text-slate-400 font-semibold">Total Issues</p>
                    <p className="text-2xl font-black text-slate-900">{stats?.total ?? issues.length}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">↑ +12% vs previous 30 days</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-amber-200/80 bg-white shadow-2xs">
                    <p className="text-xs text-amber-600 font-semibold">Open Issues</p>
                    <p className="text-2xl font-black text-amber-600">{stats?.open ?? 28}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">↓ -5% resolution queue</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-emerald-200/80 bg-white shadow-2xs">
                    <p className="text-xs text-emerald-600 font-semibold">Resolved Issues</p>
                    <p className="text-2xl font-black text-emerald-600">{stats?.resolved ?? 32}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">↑ +18% resolved on site</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-violet-200/80 bg-white shadow-2xs">
                    <p className="text-xs text-violet-600 font-semibold">Avg. Resolution</p>
                    <p className="text-2xl font-black text-violet-600">4.2 days</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">↑ +24% turnaround speed</p>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Issues by Type (Donut Card) */}
                  <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">Issues by Type</h3>
                      <span className="text-[10px] text-slate-400 font-medium">Distribution</span>
                    </div>

                    <div className="flex items-center justify-around py-3">
                      {/* Donut representation */}
                      <div className="relative flex items-center justify-center">
                        <svg className="w-32 h-32 -rotate-90">
                          <circle cx="64" cy="64" r="48" stroke="#e2e8f0" strokeWidth="16" fill="transparent" />
                          <circle cx="64" cy="64" r="48" stroke="#0ea5e9" strokeWidth="16" strokeDasharray="301" strokeDashoffset="100" fill="transparent" />
                          <circle cx="64" cy="64" r="48" stroke="#3b82f6" strokeWidth="16" strokeDasharray="301" strokeDashoffset="180" fill="transparent" />
                          <circle cx="64" cy="64" r="48" stroke="#f59e0b" strokeWidth="16" strokeDasharray="301" strokeDashoffset="245" fill="transparent" />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-xl font-black text-slate-900">{issues.length}</span>
                          <span className="block text-[9px] text-slate-400 uppercase font-bold">Total</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-sky-500"></span>
                          <span className="text-slate-600">Water Supply (34%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                          <span className="text-slate-600">Pipe Leak (26%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                          <span className="text-slate-600">Drain Blockage (23%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                          <span className="text-slate-600">Dirty Toilet (17%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Issues by Status (Bar Card) */}
                  <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">Issues by Status</h3>
                      <span className="text-[10px] text-slate-400 font-medium">Resolution funnel</span>
                    </div>

                    <div className="flex items-end justify-between gap-3 h-36 pt-4 px-2">
                      {[
                        { label: "Reported", count: 16, color: "bg-rose-500" },
                        { label: "Verified", count: 12, color: "bg-amber-500" },
                        { label: "In Progress", count: 15, color: "bg-sky-500" },
                        { label: "Resolved", count: 21, color: "bg-emerald-500" },
                        { label: "Rejected", count: 3, color: "bg-slate-400" },
                      ].map((bar) => (
                        <div key={bar.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[11px] font-bold text-slate-800">{bar.count}</span>
                          <div
                            className={`w-full max-w-[36px] rounded-t-lg ${bar.color} transition-all`}
                            style={{ height: `${(bar.count / 25) * 100}%` }}
                          />
                          <span className="text-[9px] text-slate-500 text-center font-medium truncate w-full">
                            {bar.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Map & Hotspots Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Nagpur Issue Map */}
                  <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-cyan-600" />
                        <h3 className="text-xs font-bold text-slate-900">Nagpur Issue Map</h3>
                      </div>
                      <span className="text-[10px] text-slate-400">Live PostGIS Clusters</span>
                    </div>
                    <div className="h-[280px] rounded-xl overflow-hidden border border-slate-100">
                      <MapViewer issues={issues} hotspots={hotspots} />
                    </div>
                  </div>

                  {/* Top Hotspots List */}
                  <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-rose-500" />
                        <h3 className="text-xs font-bold text-slate-900">Top Hotspots</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab("hotspots")}
                        className="text-[11px] font-bold text-cyan-700 hover:underline"
                      >
                        View all
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {[
                        { name: "Shantinagar", type: "Pipe Leak", reports: "12 reports • 1.2 km", risk: "High", badge: "bg-rose-100 text-rose-700" },
                        { name: "Krida Nagar", type: "Drain Blockage", reports: "8 reports • 2.1 km", risk: "High", badge: "bg-rose-100 text-rose-700" },
                        { name: "Dharampeth", type: "Water Supply Interruption", reports: "6 reports • 0.8 km", risk: "Medium", badge: "bg-amber-100 text-amber-700" },
                        { name: "Futala", type: "Dirty Public Toilet", reports: "5 reports • 1.5 km", risk: "Medium", badge: "bg-amber-100 text-amber-700" },
                        { name: "Sonegaon", type: "Water Supply Interruption", reports: "4 reports • 3.0 km", risk: "Low", badge: "bg-emerald-100 text-emerald-700" },
                      ].map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-500">{item.type} • {item.reports}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.badge}`}>
                            {item.risk}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Reports & Mini Priority Queue */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Recent Reports */}
                  <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">Recent Reports</h3>
                      <button
                        onClick={() => setActiveTab("issues")}
                        className="text-[11px] font-bold text-cyan-700 hover:underline"
                      >
                        View all
                      </button>
                    </div>

                    <div className="space-y-2">
                      {issues.slice(0, 4).map((issue) => (
                        <div
                          key={issue.id}
                          className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                              💧
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 capitalize">
                                {ISSUE_TYPE_LABELS[issue.type] || issue.type}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {issue.ward_name || `Ward ${issue.ward_id}`} • {new Date(issue.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              STATUS_META[issue.status]?.badge || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {STATUS_META[issue.status]?.label || issue.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority Maintenance Mini Queue */}
                  <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">Priority Maintenance Queue</h3>
                      <button
                        onClick={() => setActiveTab("priority")}
                        className="text-[11px] font-bold text-cyan-700 hover:underline"
                      >
                        View all
                      </button>
                    </div>

                    <div className="space-y-2">
                      {priorityIssues.slice(0, 4).map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800 font-black text-[11px]">
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 capitalize">
                                {ISSUE_TYPE_LABELS[p.type as IssueType] || p.type}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {p.ward_name} • Score: {Math.round(p.priority_score)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => openStatusModal(p)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                          >
                            Update
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SCREEN 2: ISSUES (Search, filter, manage all reported issues)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "issues" && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Issues</h1>
                    <p className="text-xs text-slate-500">
                      View and manage all reported issues across the city with real-time updates.
                    </p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>

                {/* Filter Controls Row */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by location, address or ID..."
                        value={issueSearch}
                        onChange={(e) => {
                          setIssueSearch(e.target.value);
                          setIssuePage(1);
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    {/* Type Filter */}
                    <select
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setIssuePage(1);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium focus:bg-white focus:outline-none"
                    >
                      <option value="all">All Issue Types</option>
                      <option value="pipe_leak">Pipe Leak</option>
                      <option value="water_interruption">Water Interruption</option>
                      <option value="drain_blockage">Drain Blockage</option>
                      <option value="dirty_toilet">Dirty Public Toilet</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setIssuePage(1);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium focus:bg-white focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="reported">Reported</option>
                      <option value="verified">Verified</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    {/* Ward Filter */}
                    <select
                      value={filterWard}
                      onChange={(e) => {
                        setFilterWard(e.target.value);
                        setIssuePage(1);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium focus:bg-white focus:outline-none"
                    >
                      <option value="all">All Wards</option>
                      {wards.map((w) => (
                        <option key={w.id} value={String(w.id)}>
                          Ward {w.id}: {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(filterType !== "all" || filterStatus !== "all" || filterWard !== "all" || issueSearch) && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">
                        Found <strong>{filteredIssues.length}</strong> matching issues
                      </span>
                      <button
                        onClick={() => {
                          setFilterType("all");
                          setFilterStatus("all");
                          setFilterWard("all");
                          setIssueSearch("");
                          setIssuePage(1);
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Issues Table */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold">
                        <tr>
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Photo</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Ward</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Submitted</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedIssues.map((issue, idx) => {
                          const statusMeta = STATUS_META[issue.status] || STATUS_META.reported;
                          return (
                            <tr key={issue.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-4 font-mono text-slate-400">
                                #{(issuePage - 1) * pageSize + idx + 1}
                              </td>
                              <td className="py-3 px-4">
                                {issue.photo_url ? (
                                  <img
                                    src={issue.photo_url}
                                    alt="thumb"
                                    className="h-9 w-9 rounded-lg object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                                    No img
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-900 capitalize">
                                  {ISSUE_TYPE_LABELS[issue.type] || issue.type}
                                </p>
                                <p className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">{issue.description}</p>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-700">
                                {issue.ward_name || `Ward ${issue.ward_id}`}
                              </td>
                              <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                                {issue.address_text || "Nagpur, MH"}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(issue.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.badge}`}>
                                  {statusMeta.label}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <Link
                                    href={`/issues/${issue.id}`}
                                    className="px-2 py-1 rounded-md text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition"
                                  >
                                    View
                                  </Link>
                                  <button
                                    onClick={() => openStatusModal(issue)}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition"
                                  >
                                    Update
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Showing {(issuePage - 1) * pageSize + 1} to{" "}
                      {Math.min(issuePage * pageSize, filteredIssues.length)} of {filteredIssues.length} issues
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIssuePage((p) => Math.max(p - 1, 1))}
                        disabled={issuePage === 1}
                        className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setIssuePage(i + 1)}
                          className={`h-7 w-7 rounded-md text-xs font-bold transition ${
                            issuePage === i + 1 ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setIssuePage((p) => Math.min(p + 1, totalPages))}
                        disabled={issuePage === totalPages}
                        className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SCREEN 3: HOTSPOTS (Spatial clustering, filters, radar map)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "hotspots" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Hotspots</h1>
                  <p className="text-xs text-slate-500">
                    Recurring issue clusters detected via PostGIS spatial engine and density algorithms.
                  </p>
                </div>

                {/* Map + Hotspot Filters Split */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Map */}
                  <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Cluster Density Map</span>
                      <span className="text-[11px] text-rose-600 font-bold">{filteredHotspots.length} Active Hotspots</span>
                    </div>
                    <div className="h-[380px] rounded-xl overflow-hidden border border-slate-100">
                      <MapViewer issues={issues} hotspots={filteredHotspots} />
                    </div>
                  </div>

                  {/* Hotspot Filters Card */}
                  <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                      Hotspot Filters
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Issue Type</label>
                        <select
                          value={hotspotFilterType}
                          onChange={(e) => setHotspotFilterType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 font-medium"
                        >
                          <option value="all">All Types</option>
                          <option value="pipe_leak">Pipe Leak</option>
                          <option value="water_interruption">Water Interruption</option>
                          <option value="drain_blockage">Drain Blockage</option>
                          <option value="dirty_toilet">Dirty Public Toilet</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Min Reports Threshold: <strong>{hotspotMinReports}</strong>
                        </label>
                        <input
                          type="range"
                          min="2"
                          max="10"
                          value={hotspotMinReports}
                          onChange={(e) => setHotspotMinReports(Number(e.target.value))}
                          className="w-full accent-cyan-600"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Cluster Radius: <strong>{hotspotRadius}m</strong>
                        </label>
                        <input
                          type="range"
                          min="100"
                          max="500"
                          step="50"
                          value={hotspotRadius}
                          onChange={(e) => setHotspotRadius(Number(e.target.value))}
                          className="w-full accent-cyan-600"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Time Range</label>
                        <select className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 font-medium">
                          <option>Last 30 days</option>
                          <option>Last 60 days</option>
                          <option>All time</option>
                        </select>
                      </div>

                      <button
                        onClick={loadAdminData}
                        className="w-full mt-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white py-2.5 font-bold transition shadow-xs"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hotspot List Table */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900">Hotspot Registry</h3>
                    <span className="text-[11px] text-slate-400">Sorted by spatial recurrence</span>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Ward</th>
                        <th className="py-3 px-4">Issues Count</th>
                        <th className="py-3 px-4">Primary Type</th>
                        <th className="py-3 px-4">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHotspots.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono text-slate-400">#{i + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{h.ward_name} Cluster</td>
                          <td className="py-3 px-4 text-slate-600">Ward {h.ward_id}</td>
                          <td className="py-3 px-4 font-black text-rose-600">{h.recurrence_count} reports</td>
                          <td className="py-3 px-4 capitalize">{ISSUE_TYPE_LABELS[h.type] || h.type}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                h.recurrence_count >= 5
                                  ? "bg-rose-100 text-rose-700"
                                  : h.recurrence_count >= 3
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {h.recurrence_count >= 5 ? "High" : h.recurrence_count >= 3 ? "Medium" : "Low"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SCREEN 4: PRIORITY LIST (Maintenance queue, scores, SLA)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "priority" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Priority Maintenance Queue</h1>
                    <p className="text-xs text-slate-500">
                      Automated triage ranked by formula: <code>Upvotes + (Days Open × 1.5) + (Hotspot Recurrence × 3)</code>
                    </p>
                  </div>
                  <span className="self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                    📅 Last 30 days
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Issue</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Priority Score</th>
                        <th className="py-3 px-4">Severity</th>
                        <th className="py-3 px-4">Days Open</th>
                        <th className="py-3 px-4">Ward</th>
                        <th className="py-3 px-4">SLA</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {priorityIssues.map((p, idx) => {
                        const score = Math.round(p.priority_score);
                        const isBreach = p.days_open > 7;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900 capitalize">
                                {ISSUE_TYPE_LABELS[p.type as IssueType] || p.type}
                              </p>
                              <p className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">{p.description}</p>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-700">{p.ward_name}</td>
                            <td className="py-3.5 px-4 font-black text-rose-600 text-sm">{score}</td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  score > 40
                                    ? "bg-rose-100 text-rose-700"
                                    : score > 25
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {score > 40 ? "High" : score > 25 ? "Medium" : "Low"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">{Math.round(p.days_open)}d</td>
                            <td className="py-3.5 px-4 text-slate-600">Ward {p.ward_id}</td>
                            <td className="py-3.5 px-4">
                              {isBreach ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="h-3 w-3" /> Breach
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="h-3 w-3" /> On Track
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => setAssignIssue(p)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-700 text-white hover:bg-cyan-800 transition"
                                >
                                  Assign
                                </button>
                                <button
                                  onClick={() => openStatusModal(p)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                                >
                                  Update
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SCREEN 5: REPORTS (Analytics, charts, CSV/PDF export)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "reports" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Reports &amp; Analytics</h1>
                    <p className="text-xs text-slate-500">
                      Civic performance indicators, resolution time tracking, and official export summaries.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Report</span>
                    </button>
                  </div>
                </div>

                {/* 4 Summary Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                    <p className="text-xs text-slate-400 font-semibold">Total Reports</p>
                    <p className="text-2xl font-black text-slate-900">{stats?.total ?? 70}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-white shadow-2xs">
                    <p className="text-xs text-emerald-600 font-semibold">Resolved</p>
                    <p className="text-2xl font-black text-emerald-600">{stats?.resolved ?? 32}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-amber-200 bg-white shadow-2xs">
                    <p className="text-xs text-amber-600 font-semibold">Open</p>
                    <p className="text-2xl font-black text-amber-600">{stats?.open ?? 28}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-violet-200 bg-white shadow-2xs">
                    <p className="text-xs text-violet-600 font-semibold">Avg. Resolution Time</p>
                    <p className="text-2xl font-black text-violet-600">4.2 days</p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Reports Over Time (Line trend) */}
                  <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">Reports Over Time</h3>
                      <div className="flex items-center gap-3 text-[10px] font-semibold">
                        <span className="flex items-center gap-1 text-cyan-600">
                          <span className="h-2 w-2 rounded-full bg-cyan-600"></span> Total
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600">
                          <span className="h-2 w-2 rounded-full bg-emerald-600"></span> Resolved
                        </span>
                      </div>
                    </div>

                    <div className="h-48 flex items-end justify-between gap-4 pt-6 px-4">
                      {[
                        { day: "Oct 10", total: 12, res: 8 },
                        { day: "Oct 11", total: 15, res: 10 },
                        { day: "Oct 12", total: 18, res: 14 },
                        { day: "Oct 13", total: 14, res: 11 },
                        { day: "Oct 14", total: 22, res: 18 },
                        { day: "Oct 15", total: 28, res: 22 },
                        { day: "Oct 16", total: 25, res: 24 },
                      ].map((item, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div className="w-full flex items-end justify-center gap-1.5 h-full">
                            <div
                              className="w-3 rounded-t-sm bg-cyan-500"
                              style={{ height: `${(item.total / 30) * 100}%` }}
                              title={`Total: ${item.total}`}
                            />
                            <div
                              className="w-3 rounded-t-sm bg-emerald-500"
                              style={{ height: `${(item.res / 30) * 100}%` }}
                              title={`Resolved: ${item.res}`}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Issues by Type */}
                  <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-900">Issues by Type</h3>
                    <div className="space-y-3 pt-2 text-xs">
                      {[
                        { name: "Water Supply", pct: 34, color: "bg-sky-500" },
                        { name: "Pipe Leak", pct: 26, color: "bg-blue-500" },
                        { name: "Drain Blockage", pct: 23, color: "bg-amber-500" },
                        { name: "Dirty Public Toilet", pct: 17, color: "bg-rose-500" },
                      ].map((t) => (
                        <div key={t.name} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                            <span>{t.name}</span>
                            <span>{t.pct}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full ${t.color}`} style={{ width: `${t.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resolution by Ward Table / Bar representation */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-900">Resolution Progress by Ward</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wards.map((ward) => (
                      <div key={ward.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>
                            Ward {ward.id}: {ward.name}
                          </span>
                          <span className="text-emerald-600">82%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "82%" }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>14 Resolved</span>
                          <span>3 Open</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SCREEN 6: USERS (Citizen & Admin role management)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "users" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Users</h1>
                    <p className="text-xs text-slate-500">
                      Manage administrators, municipal engineers, and registered citizen accounts.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add User</span>
                  </button>
                </div>

                {/* Filter / Search */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
                    <span>
                      Total Registered: <strong>{usersList.length}</strong>
                    </span>
                  </div>
                </div>

                {/* Users Table */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Reports Filed</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u, i) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-mono text-slate-400">#{i + 1}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800 font-bold text-xs">
                                {u.name.charAt(0)}
                              </div>
                              <span className="font-bold text-slate-900">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                u.role === "admin"
                                  ? "bg-amber-100 text-amber-800"
                                  : u.role === "engineer"
                                  ? "bg-violet-100 text-violet-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">{u.reports}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                u.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                const nextStatus = u.status === "Active" ? "Inactive" : "Active";
                                setUsersList((prev) =>
                                  prev.map((item) => (item.id === u.id ? { ...item, status: nextStatus } : item))
                                );
                              }}
                              className="text-[11px] font-bold text-cyan-700 hover:underline"
                            >
                              Toggle Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SCREEN 7: WARDS (Management and ward performance grid)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "wards" && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Wards</h1>
                  <p className="text-xs text-slate-500">
                    Nagpur municipal zone management and performance overview.
                  </p>
                </div>

                {/* Ward Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wards.map((ward) => (
                    <div
                      key={ward.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-4"
                    >
                      {/* Mini Map Thumbnail */}
                      <div className="h-32 rounded-xl bg-slate-100 relative overflow-hidden flex items-center justify-center border border-slate-200/70">
                        <div className="text-center">
                          <MapPin className="h-6 w-6 text-cyan-600 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-slate-500">
                            Lat: {ward.lat?.toFixed(3) || "21.14"}, Lng: {ward.lng?.toFixed(3) || "79.08"}
                          </span>
                        </div>
                      </div>

                      {/* Header */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-900">
                            Ward {ward.id}: {ward.name}
                          </h3>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Nagpur Municipal Corporation</p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">Total</p>
                          <p className="text-sm font-black text-slate-800">14</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-amber-600 font-semibold">Open</p>
                          <p className="text-sm font-black text-amber-600">3</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-600 font-semibold">Resolved</p>
                          <p className="text-sm font-black text-emerald-600">11</p>
                        </div>
                      </div>

                      {/* Manage Ward Action */}
                      <button
                        onClick={() => {
                          setFilterWard(String(ward.id));
                          setActiveTab("issues");
                        }}
                        className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Manage Ward Issues →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SCREEN 8: SETTINGS (Profile, organization, workflow settings)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Settings</h1>
                  <p className="text-xs text-slate-500">
                    Configure municipal administration profile, notifications, and workflow rules.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Form: Profile & Organization */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Admin Profile */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Admin Profile
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-slate-500 font-semibold mb-1">Full Name</label>
                          <input
                            type="text"
                            defaultValue={user.full_name || "Rohan Gupta"}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 font-semibold mb-1">Email Address</label>
                          <input
                            type="email"
                            defaultValue="admin@jalsaathi.demo"
                            disabled
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
                          <input
                            type="text"
                            defaultValue="+91 98765 43210"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 font-semibold mb-1">Designation</label>
                          <input
                            type="text"
                            defaultValue="Municipal Executive Engineer"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Organization Details */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Organization Details
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-slate-500 font-semibold mb-1">Corporation Name</label>
                          <input
                            type="text"
                            defaultValue="Nagpur Municipal Corporation"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 font-semibold mb-1">Department</label>
                          <input
                            type="text"
                            defaultValue="Water & Sanitation Works"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Form: Preferences & Workflows */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Notification Preferences */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Notification Preferences
                      </h3>

                      <div className="space-y-3 text-xs">
                        {[
                          { label: "New Report Alert", desc: "Instant alert on newly filed citizen issue", val: notifReports, set: setNotifReports },
                          { label: "Hotspot Cluster Alert", desc: "Notify when DBSCAN hits 3+ recurrence", val: notifHotspots, set: setNotifHotspots },
                          { label: "Status Update Emails", desc: "Send email when status is modified", val: notifStatus, set: setNotifStatus },
                          { label: "Daily Summary Digest", desc: "Morning summary of all open SLA tasks", val: notifSummary, set: setNotifSummary },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">{item.label}</p>
                              <p className="text-[10px] text-slate-400">{item.desc}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={item.val}
                              onChange={(e) => item.set(e.target.checked)}
                              className="h-4 w-4 accent-cyan-600 rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status Workflow Settings */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Status Workflow Settings
                      </h3>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">Require Admin Remarks</p>
                            <p className="text-[10px] text-slate-400">Enforce remarks on resolving issues</p>
                          </div>
                          <input type="checkbox" defaultChecked className="h-4 w-4 accent-cyan-600 rounded" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">Allow Citizen Comments</p>
                            <p className="text-[10px] text-slate-400">Citizens can add feedback to updates</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={allowCitizenComments}
                            onChange={(e) => setAllowCitizenComments(e.target.checked)}
                            className="h-4 w-4 accent-cyan-600 rounded"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setToastMessage("Settings saved successfully!");
                          setTimeout(() => setToastMessage(null), 3000);
                        }}
                        className="w-full mt-4 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs transition shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── STATUS UPDATE MODAL ── */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Update Issue Status</h3>
                <p className="text-[11px] text-slate-500 capitalize">
                  {ISSUE_TYPE_LABELS[selectedIssue.type as IssueType] || selectedIssue.type} • {selectedIssue.ward_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current status display */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Current Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${STATUS_META[selectedIssue.status as IssueStatus]?.badge || "bg-slate-200 text-slate-700"}`}>
                {STATUS_META[selectedIssue.status as IssueStatus]?.label || selectedIssue.status}
              </span>
            </div>

            {/* Error Banner */}
            {updateError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{updateError}</span>
              </div>
            )}

            {/* Form */}
            {ALLOWED_TRANSITIONS[selectedIssue.status]?.length > 0 ? (
              <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1.5">Next Allowed Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => {
                      setNewStatus(e.target.value);
                      setUpdateError(null);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    {ALLOWED_TRANSITIONS[selectedIssue.status].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1.5">
                    Official Admin Remark <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Pipeline inspected by Ward 3 maintenance team. Work crew dispatched."
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIssue(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating || !newStatus}
                    className="px-5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                  >
                    {updating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Status</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-3">
                <p className="text-xs font-semibold text-amber-800">
                  This issue has reached a final state (<strong>{selectedIssue.status}</strong>) and cannot be changed further.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ASSIGN ENGINEER MODAL ── */}
      {assignIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assign Maintenance Crew</h3>
                <p className="text-[11px] text-slate-500 capitalize">
                  {ISSUE_TYPE_LABELS[assignIssue.type as IssueType] || assignIssue.type} • {assignIssue.ward_name}
                </p>
              </div>
              <button
                onClick={() => setAssignIssue(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Assign To Engineer</label>
                <select
                  value={assignedEngineer}
                  onChange={(e) => setAssignedEngineer(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="Er. Rajesh Sharma (Ward 3)">Er. Rajesh Sharma (Ward 3 - Dharampeth)</option>
                  <option value="Er. Sunita Patil (Ward 1)">Er. Sunita Patil (Ward 1 - Shantinagar)</option>
                  <option value="Er. Manoj Deshmukh (Ward 5)">Er. Manoj Deshmukh (Ward 5 - Itwari)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Target SLA Days</label>
                <select
                  value={slaTargetDays}
                  onChange={(e) => setSlaTargetDays(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="1">1 Day (Urgent Priority)</option>
                  <option value="2">2 Days (Standard SLA)</option>
                  <option value="5">5 Days (Scheduled Maintenance)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignIssue(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssignIssue(null);
                    setToastMessage(`Assigned to ${assignedEngineer} with ${slaTargetDays}-day SLA!`);
                    setTimeout(() => setToastMessage(null), 3500);
                  }}
                  className="px-5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold shadow-xs"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD USER MODAL ── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add New User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newUserName.trim() || !newUserEmail.trim()) return;
                setUsersList((prev) => [
                  ...prev,
                  {
                    id: String(prev.length + 1),
                    name: newUserName.trim(),
                    email: newUserEmail.trim(),
                    role: newUserRole,
                    reports: 0,
                    status: "Active",
                  },
                ]);
                setShowAddUserModal(false);
                setNewUserName("");
                setNewUserEmail("");
                setToastMessage("User account added successfully!");
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@nmc.gov.in"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as typeof newUserRole)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  <option value="citizen">Citizen</option>
                  <option value="engineer">Municipal Engineer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold shadow-xs"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
