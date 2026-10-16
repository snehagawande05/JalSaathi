"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MapPin,
  Calendar,
  ChevronRight,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { apiFetch } from "@/lib/api";
import { ISSUE_TYPE_LABELS, STATUS_META } from "@/lib/constants";
import type { Issue } from "@/lib/types";

// Dynamic map for detail panel preview
const MiniMap = dynamic(
  () =>
    import("@/components/map/MapViewer").then((mod) => {
      // Simple wrapper to display single issue on map
      return function SingleIssueMap({ issue }: { issue: Issue }) {
        return (
          <mod.default
            issues={[issue]}
            center={{ lat: issue.lat, lng: issue.lng }}
            zoom={14}
            className="h-[200px] w-full rounded-2xl"
          />
        );
      };
    }),
  { ssr: false }
);

export default function MyReportsPage() {
  const { user, loading: authLoading, quickLogin } = useAuth();
  const [reports, setReports] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function loadReports() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await apiFetch<Issue[]>("/api/me/issues");
        setReports(data || []);
        if (data && data.length > 0) {
          // Fetch full detail with history for first report
          fetchFullIssue(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load user reports", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [user]);

  const fetchFullIssue = async (id: string) => {
    setLoadingDetail(true);
    try {
      const full = await apiFetch<Issue>(`/api/issues/${id}`);
      setSelectedIssue(full);
    } catch {
      // Fallback to item in array
      const found = reports.find((r) => r.id === id);
      if (found) setSelectedIssue(found);
    } finally {
      setLoadingDetail(false);
    }
  };

  const metrics = useMemo(() => {
    const total = reports.length;
    const open = reports.filter((r) => r.status === "reported" || r.status === "verified").length;
    const inProgress = reports.filter((r) => r.status === "in_progress").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    return { total, open, inProgress, resolved };
  }, [reports]);

  if (authLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign in to view your reports</h2>
          <p className="text-xs text-slate-500">
            Track real-time progress on problems you reported or test with our demo citizen account.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => quickLogin("citizen1")}
              className="w-full rounded-xl bg-sky-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-sky-500 transition"
            >
              ⚡ 1-Click Login as Asha Patil (23 seeded reports)
            </button>
            <Link
              href="/login"
              className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Sign In with Other Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">My Reports</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Track the status of your reported issues and view the latest municipal updates.
        </p>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-sky-100 bg-white shadow-2xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Total Reports</p>
            <p className="text-xl font-black text-slate-900">{metrics.total}</p>
            <span className="text-[10px] text-slate-400 font-medium">Logged in account</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-rose-100 bg-white shadow-2xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Open</p>
            <p className="text-xl font-black text-slate-900">{metrics.open}</p>
            <span className="text-[10px] text-rose-600 font-medium">Needs attention</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-100 bg-white shadow-2xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">In Progress</p>
            <p className="text-xl font-black text-slate-900">{metrics.inProgress}</p>
            <span className="text-[10px] text-amber-600 font-medium">Crew dispatched</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-100 bg-white shadow-2xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Resolved</p>
            <p className="text-xl font-black text-slate-900">{metrics.resolved}</p>
            <span className="text-[10px] text-emerald-600 font-medium">Completed</span>
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Split: List on Left, Detail & Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left List */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-slate-900">Your Reports ({reports.length})</h2>
            <span className="text-xs text-slate-400">Sorted by Newest</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-sky-600" />
              <span>Loading reports...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
              <p className="text-xs text-slate-500">You haven&apos;t reported any issues yet.</p>
              <Link
                href="/report"
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 shadow-xs"
              >
                Report an Issue
              </Link>
            </div>
          ) : (
            reports.map((report) => {
              const isSelected = selectedIssue?.id === report.id;
              const statusMeta = STATUS_META[report.status] || STATUS_META.reported;

              return (
                <div
                  key={report.id}
                  onClick={() => fetchFullIssue(report.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/40 shadow-xs ring-1 ring-sky-500/20"
                      : "border-slate-200/90 bg-white hover:border-sky-300 hover:shadow-2xs"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {ISSUE_TYPE_LABELS[report.type] || report.type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1">{report.description}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>Ward {report.ward_id || "Nagpur"}</span>
                      </span>
                      <span>•</span>
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition ${
                      isSelected ? "text-sky-600 translate-x-0.5" : "text-slate-300"
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-6">
          {selectedIssue ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (STATUS_META[selectedIssue.status] || STATUS_META.reported).badge
                    }`}
                  >
                    {(STATUS_META[selectedIssue.status] || STATUS_META.reported).label}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {ISSUE_TYPE_LABELS[selectedIssue.type] || selectedIssue.type}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{selectedIssue.ward_name || `Ward ${selectedIssue.ward_id}`}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{new Date(selectedIssue.created_at).toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-xl">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>{selectedIssue.upvote_count} Upvotes</span>
                </div>
              </div>

              {/* Map Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Location Map</span>
                  <Link
                    href={`/issues/${selectedIssue.id}`}
                    className="inline-flex items-center gap-1 text-sky-600 hover:underline font-bold text-[11px]"
                  >
                    <span>Full View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <MiniMap issue={selectedIssue} />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description</h4>
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                  {selectedIssue.description}
                </p>
              </div>

              {/* Status History Timeline */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-sky-600" />
                  <span>Status History Timeline</span>
                </h4>

                {loadingDetail ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-sky-600" />
                    <span>Loading timeline...</span>
                  </div>
                ) : (
                  <div className="space-y-4 pl-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {(selectedIssue.status_history || [
                      {
                        id: 1,
                        old_status: null,
                        new_status: selectedIssue.status,
                        remark: "Issue reported by citizen.",
                        changed_at: selectedIssue.created_at,
                        changed_by: "Citizen",
                      },
                    ]).map((hist, idx) => {
                      const meta = STATUS_META[hist.new_status] || STATUS_META.reported;
                      return (
                        <div key={idx} className="relative flex items-start gap-3 pl-5">
                          <span
                            className="absolute left-1.5 top-1.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white ring-2 ring-slate-100"
                            style={{ backgroundColor: meta.color }}
                          ></span>
                          <div className="text-xs space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 capitalize">{meta.label}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(hist.changed_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">{hist.remark || "Status updated."}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
              Select a report from the list to view its full details and resolution timeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
