"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  TrendingUp,
  MapPin,
  FileCheck2,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { apiFetch } from "@/lib/api";
import { ISSUE_TYPE_LABELS, STATUS_META } from "@/lib/constants";
import type { Hotspot } from "@/lib/types";

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

export default function AdminDashboardPage() {
  const { user, loading: authLoading, quickLogin } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [priorityIssues, setPriorityIssues] = useState<PriorityIssue[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);

  // Status update modal state
  const [selectedIssue, setSelectedIssue] = useState<PriorityIssue | null>(null);
  const [newStatus, setNewStatus] = useState<string>("verified");
  const [remark, setRemark] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"priority" | "hotspots" | "wards">("priority");

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, priorityData, hotspotsData] = await Promise.all([
        apiFetch<StatsData>("/api/admin/stats"),
        apiFetch<PriorityIssue[]>("/api/admin/priority?limit=25"),
        apiFetch<Hotspot[]>("/api/hotspots"),
      ]);
      setStats(statsData);
      setPriorityIssues(priorityData || []);
      setHotspots(hotspotsData || []);
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

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
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
      await loadAdminData();
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto" />
      </div>
    );
  }

  // Role guard: Must be Admin
  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Admin Authorization Required</h2>
          <p className="text-xs text-slate-500">
            This portal is restricted to Municipal Engineers and Admins to manage priority queues and issue resolution.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => quickLogin("admin")}
              className="w-full rounded-xl bg-amber-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-amber-500 transition"
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
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Civic Dashboard</h1>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                Nagpur Municipal Net
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Logged in as <strong className="text-slate-800">{user.full_name}</strong> (Administrator)
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <p className="text-xs text-slate-400 font-semibold">Total Reports</p>
          <p className="text-2xl font-black text-slate-900">{stats?.total ?? 70}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Across all 6 wards</p>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 bg-white shadow-2xs">
          <p className="text-xs text-amber-600 font-semibold">Open in Queue</p>
          <p className="text-2xl font-black text-amber-600">{stats?.open ?? 52}</p>
          <p className="text-[10px] text-amber-700/80 mt-0.5">Reported & Verified</p>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 bg-white shadow-2xs">
          <p className="text-xs text-emerald-600 font-semibold">Resolved</p>
          <p className="text-2xl font-black text-emerald-600">{stats?.resolved ?? 13}</p>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Fixed on site</p>
        </div>

        <div className="p-4 rounded-2xl border border-sky-200 bg-white shadow-2xs">
          <p className="text-xs text-sky-600 font-semibold">Avg Turnaround</p>
          <p className="text-2xl font-black text-sky-600">
            {stats ? `${Math.round(stats.avg_resolution_hours / 24)}d` : "4.2d"}
          </p>
          <p className="text-[10px] text-sky-700/80 mt-0.5">~{stats?.avg_resolution_hours?.toFixed(0) || "311"} hours</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("priority")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "priority" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Priority Maintenance Queue ({priorityIssues.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("hotspots")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "hotspots" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span>DBSCAN Hotspots ({hotspots.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("wards")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "wards" ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Ward-wise Analytics</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600 mx-auto mb-2" />
          <span>Loading admin queue...</span>
        </div>
      ) : activeTab === "priority" ? (
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Priority-Sorted Open Issues</h2>
              <p className="text-[11px] text-slate-500">
                Formula: Upvotes + (Days Open × 1.5) + (Hotspot Recurrence × 3)
              </p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-xl">
              Automatic Algorithm Rank
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Issue Type</th>
                  <th className="py-3 px-4">Ward</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Breakdown (Upvotes + Age + Cluster)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorityIssues.map((p) => {
                  const statusMeta = STATUS_META[p.status as keyof typeof STATUS_META] || STATUS_META.reported;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-black text-rose-600 text-sm">
                        {Math.round(p.priority_score)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 capitalize">
                          {ISSUE_TYPE_LABELS[p.type as keyof typeof ISSUE_TYPE_LABELS] || p.type}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{p.description}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{p.ward_name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.badge}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                        {p.upvote_points} + {p.age_points} + {p.hotspot_points}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedIssue(p);
                            setNewStatus(p.status === "reported" ? "verified" : "in_progress");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-600 transition shadow-2xs"
                        >
                          <FileCheck2 className="h-3 w-3" />
                          <span>Update Status</span>
                        </button>
                        <Link
                          href={`/issues/${p.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "hotspots" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotspots.map((hs, i) => (
            <div key={i} className="p-5 rounded-3xl border border-rose-100 bg-white shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 capitalize">
                  {ISSUE_TYPE_LABELS[hs.type] || hs.type}
                </span>
                <span className="text-sm font-black text-rose-600">
                  Priority: {Math.round(hs.priority_score)}
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Ward: {hs.ward_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Center: {hs.lat.toFixed(4)}, {hs.lng.toFixed(4)}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <p>• Recurrence Count: <strong>{hs.recurrence_count} reports</strong></p>
                <p>• Cluster Radius: <strong>{hs.radius_m}m</strong></p>
                <p>• Total Upvotes: <strong>{hs.total_upvotes}</strong></p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.by_ward.map((w) => (
            <div key={w.ward_id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">{w.ward_name}</h4>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  Ward #{w.ward_id}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Reports:</span>
                  <span className="font-bold text-slate-900">{w.total}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-amber-600 font-semibold">Active Open:</span>
                  <span className="font-bold text-amber-600">{w.open}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-emerald-600 font-semibold">Resolved:</span>
                  <span className="font-bold text-emerald-600">{w.resolved}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Status Update Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Update Issue Status</h3>
              <p className="text-xs text-slate-500">
                Issue ID: {selectedIssue.id.slice(0, 8)} • Current:{" "}
                <strong className="capitalize">{selectedIssue.status}</strong>
              </p>
            </div>

            {updateError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Lifecycle Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="verified">Verified (Confirmed on site)</option>
                  <option value="in_progress">In Progress (Crew assigned)</option>
                  <option value="resolved">Resolved (Completed)</option>
                  <option value="rejected">Rejected (Not actionable / fake)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Remark / Action Log</label>
                <textarea
                  rows={3}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="e.g. Field crew dispatched. Pipeline repaired and valve restored."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Commit Status Change</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
