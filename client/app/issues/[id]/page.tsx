"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  ThumbsUp,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/authContext";
import { ISSUE_TYPE_LABELS, STATUS_META } from "@/lib/constants";
import type { Issue } from "@/lib/types";

const DetailMap = dynamic(
  () =>
    import("@/components/map/MapViewer").then((mod) => {
      return function SinglePinMap({ issue }: { issue: Issue }) {
        return (
          <mod.default
            issues={[issue]}
            center={{ lat: issue.lat, lng: issue.lng }}
            zoom={14}
            className="h-[280px] w-full rounded-2xl"
          />
        );
      };
    }),
  { ssr: false }
);

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { user } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchIssue() {
      try {
        setLoading(true);
        const data = await apiFetch<Issue>(`/api/issues/${id}`);
        setIssue(data);
      } catch (err) {
        console.error("Failed to load issue", err);
      } finally {
        setLoading(false);
      }
    }
    fetchIssue();
  }, [id]);

  const handleToggleUpvote = async () => {
    if (!user) {
      alert("Please sign in or use demo login to upvote this issue.");
      return;
    }
    if (!issue || upvoting) return;

    setUpvoting(true);
    try {
      const isCurrentlyUpvoted = issue.upvoted_by_me;
      const method = isCurrentlyUpvoted ? "DELETE" : "POST";
      const res = await apiFetch<{ upvoted: boolean; upvote_count: number }>(`/api/issues/${id}/upvote`, {
        method,
      });

      setIssue((prev) =>
        prev
          ? {
              ...prev,
              upvoted_by_me: res.upvoted,
              upvote_count: res.upvote_count,
            }
          : null
      );
    } catch (err: any) {
      alert(err.message || "Failed to update upvote");
    } finally {
      setUpvoting(false);
    }
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto" />
        <p className="text-xs text-slate-500 mt-2">Loading issue details...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Issue Not Found</h2>
        <p className="text-xs text-slate-500">The report you are looking for does not exist or has been removed.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[issue.status] || STATUS_META.reported;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back button and share */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-sky-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Live Map</span>
        </Link>

        <button
          onClick={handleCopyShare}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
          <span>{copied ? "Link Copied!" : "Share Issue"}</span>
        </button>
      </div>

      {/* Main Detail Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.badge}`}>
                {statusMeta.label}
              </span>
              <span className="text-xs font-medium text-slate-400">ID: {issue.id.slice(0, 8)}</span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {ISSUE_TYPE_LABELS[issue.type] || issue.type}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{issue.ward_name || `Ward ${issue.ward_id}`}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{new Date(issue.created_at).toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Upvote Button */}
          <button
            onClick={handleToggleUpvote}
            disabled={upvoting}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition shadow-sm ${
              issue.upvoted_by_me
                ? "bg-sky-600 text-white shadow-sky-600/25 hover:bg-sky-500"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-sky-300"
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${issue.upvoted_by_me ? "fill-white" : ""}`} />
            <span>{issue.upvoted_by_me ? "Upvoted" : "Upvote (\"Me Too\")"}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black">
              {issue.upvote_count}
            </span>
          </button>
        </div>

        {/* Map and Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Issue Description</h3>
              <p className="text-sm text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 leading-relaxed">
                {issue.description}
              </p>
            </div>

            {issue.photo_url && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Site Photo</h3>
                <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-72 bg-slate-100 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={issue.photo_url} alt="Issue location" className="h-full w-full object-cover" />
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Location</h3>
              <DetailMap issue={issue} />
              <p className="text-[11px] text-slate-500 mt-1">
                Coordinates: {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        {/* Status History Timeline */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Resolution Progress Timeline</h3>
          </div>

          <div className="space-y-4 pl-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {(issue.status_history || [
              {
                id: 1,
                old_status: null,
                new_status: issue.status,
                remark: "Issue reported by citizen.",
                changed_at: issue.created_at,
                changed_by: "Citizen",
              },
            ]).map((hist, idx) => {
              const meta = STATUS_META[hist.new_status] || STATUS_META.reported;
              return (
                <div key={idx} className="relative flex items-start gap-3.5 pl-6">
                  <span
                    className="absolute left-1.5 top-1.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white ring-2 ring-slate-100"
                    style={{ backgroundColor: meta.color }}
                  ></span>
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 capitalize">{meta.label}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(hist.changed_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{hist.remark || "Status recorded."}</p>
                    <span className="text-[10px] text-slate-400 font-medium">Logged by: {hist.changed_by}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
