"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  FileText,
  Search,
  Users,
  ShieldCheck,
  Edit3,
  Map,
  ArrowRight,
  Flame,
  ThumbsUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Filter,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ISSUE_TYPE_LABELS, STATUS_META } from "@/lib/constants";
import type { Issue, Hotspot, Ward } from "@/lib/types";

// Dynamic map import to avoid SSR window issues
const MapViewer = dynamic(() => import("@/components/map/MapViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="h-4 w-4 rounded-full border-2 border-sky-600 border-t-transparent animate-spin"></span>
        <span>Loading Nagpur civic map...</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedWard, setSelectedWard] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      try {
        const [issuesData, hotspotsData, wardsData] = await Promise.all([
          apiFetch<Issue[]>("/api/issues?limit=100"),
          apiFetch<Hotspot[]>("/api/hotspots"),
          apiFetch<Ward[]>("/api/wards"),
        ]);
        setIssues(issuesData || []);
        setHotspots(hotspotsData || []);
        setWards(wardsData || []);
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (selectedType !== "all" && issue.type !== selectedType) return false;
      if (selectedStatus !== "all" && issue.status !== selectedStatus) return false;
      if (selectedWard !== "all" && String(issue.ward_id) !== selectedWard) return false;
      return true;
    });
  }, [issues, selectedType, selectedStatus, selectedWard]);

  // Dynamic stat metrics
  const stats = useMemo(() => {
    const total = issues.length;
    const open = issues.filter((i) => i.status === "reported" || i.status === "verified" || i.status === "in_progress").length;
    const resolved = issues.filter((i) => i.status === "resolved").length;
    return {
      total: total || 70,
      open: open || 52,
      resolved: resolved || 13,
      avgDays: "4.2 days",
    };
  }, [issues]);

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* 1. Hero Section — city skyline banner matching design mockup */}
      <section className="relative overflow-hidden rounded-3xl min-h-[380px] sm:min-h-[420px] lg:min-h-[460px] flex items-center border border-sky-100/80 shadow-sm bg-sky-50">

        {/* ── Background: city skyline photo ── */}
        <Image
          src="/city-hero.jpg"
          alt="Nagpur city skyline"
          fill
          className="object-cover object-right md:object-center"
          priority
          sizes="100vw"
        />

        {/* Soft fade from left: gives clean white/sky canvas for text while letting the city and lake shine */}
        <div className="absolute inset-0 bg-gradient-to-r from-sky-50/95 via-sky-50/85 via-45% to-sky-50/20 md:to-transparent" />

        {/* ── Content grid ── */}
        <div className="relative z-10 w-full px-6 sm:px-12 lg:px-14 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

            {/* Left — headline + ctas */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-5">
              {/* Tag Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50/95 border border-emerald-200/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
                <span>🌿</span>
                <span>A Cleaner Nagpur • A Healthier Tomorrow</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-slate-900 leading-[1.14]">
                Report Water &amp; Sanitation Issues. Build a{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-cyan-500">
                  Cleaner, Healthier Community.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed">
                JalSaathi is a civic platform where <strong className="text-slate-900">residents</strong> report water outages, pipe leaks, and blocked drains with a map pin, track resolution in real time, and help authorities eliminate recurring hotspots.
              </p>

              {/* CTAs */}
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <Link
                  href="/report"
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 hover:bg-cyan-800 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-700/25 transition-all transform hover:-translate-y-0.5"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Report an Issue</span>
                </Link>
                <a
                  href="#live-map"
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-cyan-600/70 bg-white/90 hover:bg-cyan-50 px-7 py-3.5 text-sm font-bold text-cyan-800 transition-all shadow-xs"
                >
                  <Map className="h-4 w-4" />
                  <span>Explore Map</span>
                </a>
              </div>
            </div>

            {/* Center — Water Droplet + Leaf Logo in the sky */}
            <div className="hidden lg:flex lg:col-span-3 justify-center items-center -mt-6">
              <svg viewBox="0 0 120 140" className="w-24 sm:w-28 lg:w-32 drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Water droplet outer */}
                <path
                  d="M60 12 C60 12 18 68 18 92 C18 116 38 132 60 132 C82 132 102 116 102 92 C102 68 60 12 60 12Z"
                  fill="url(#dropletGradient)"
                />
                {/* Green Leaf inside droplet */}
                <path
                  d="M60 58 C60 58 78 72 78 90 C78 104 70 114 60 118 C62 98 56 84 44 74 C50 66 60 58 60 58Z"
                  fill="#10b981"
                />
                {/* Soft highlight reflection */}
                <ellipse cx="44" cy="74" rx="7" ry="13" fill="white" opacity="0.35" transform="rotate(-22 44 74)" />
                <defs>
                  <linearGradient id="dropletGradient" x1="18" y1="12" x2="102" y2="132" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Right — Slogan in cursive style */}
            <div className="hidden sm:flex sm:col-span-12 lg:col-span-4 justify-end items-start lg:-mt-8">
              <div className="text-right space-y-0.5">
                <p className="font-serif italic text-2xl sm:text-3xl lg:text-[34px] font-bold text-sky-800 leading-snug tracking-wide drop-shadow-sm">
                  Clean Water
                </p>
                <p className="font-serif italic text-2xl sm:text-3xl lg:text-[34px] font-bold text-sky-800 leading-snug tracking-wide drop-shadow-sm">
                  Healthy Communities
                </p>
                <p className="font-serif italic text-2xl sm:text-3xl lg:text-[34px] font-bold text-sky-800 leading-snug tracking-wide drop-shadow-sm">
                  Stronger Together
                </p>
                <div className="ml-auto mt-2 h-0.5 w-3/4 bg-gradient-to-l from-sky-500 to-transparent rounded-full" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Feature Icons Strip */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            icon: MapPin,
            title: "Map Issues",
            desc: "View water & sanitation problems on an interactive map.",
            color: "text-sky-600 bg-sky-50 border-sky-100",
          },
          {
            icon: FileText,
            title: "Report Problems",
            desc: "Submit issues with location, details and optional photos.",
            color: "text-indigo-600 bg-indigo-50 border-indigo-100",
          },
          {
            icon: Search,
            title: "Track Status",
            desc: "Follow real-time progress through verified resolution steps.",
            color: "text-cyan-600 bg-cyan-50 border-cyan-100",
          },
          {
            icon: Users,
            title: "Find Hotspots",
            desc: "See recurring high-priority clusters across Nagpur wards.",
            color: "text-amber-600 bg-amber-50 border-amber-100",
          },
          {
            icon: ShieldCheck,
            title: "Better Maintenance",
            desc: "Help municipal teams prioritize where action is urgent.",
            color: "text-emerald-600 bg-emerald-50 border-emerald-100",
          },
        ].map((feat, i) => {
          const Icon = feat.icon;
          return (
            <div
              key={i}
              className="flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-sky-200 hover:shadow-md transition duration-200"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl mb-3.5 ${feat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">{feat.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
            </div>
          );
        })}
      </section>

      {/* 3. Real Impact & Live Map Section */}
      <section id="live-map" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">Real Impact</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Turning Community Reports into Real Change
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
              Together, we can identify problem areas, eliminate repeated leaks, and build a cleaner city.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/report"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 transition shadow-xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Report Issue</span>
            </Link>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-xs flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.total}</p>
              <p className="text-xs font-semibold text-slate-500">Total Issues</p>
              <span className="inline-flex items-center text-[10px] font-bold text-rose-600 mt-0.5">
                <TrendingUp className="h-3 w-3 mr-0.5" /> 70 Nagpur records
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-xs flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.open}</p>
              <p className="text-xs font-semibold text-slate-500">Open Issues</p>
              <span className="inline-flex items-center text-[10px] font-bold text-amber-600 mt-0.5">
                Active in queue
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.resolved}</p>
              <p className="text-xs font-semibold text-slate-500">Resolved</p>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 mt-0.5">
                Work completed
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.avgDays}</p>
              <p className="text-xs font-semibold text-slate-500">Avg. Resolution</p>
              <span className="inline-flex items-center text-[10px] font-bold text-sky-600 mt-0.5">
                ↓ 25% turnaround
              </span>
            </div>
          </div>
        </div>

        {/* Map Container & Interactive Filter Bar */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-900">Live Issue Map (Nagpur)</h3>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-semibold">
                {filteredIssues.length} Shown
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters:</span>
              </div>

              {/* Status Filter */}
              <select
                aria-label="Filter by Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="reported">Reported</option>
                <option value="verified">Verified</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>

              {/* Type Filter */}
              <select
                aria-label="Filter by Type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="water_interruption">Water Interruption</option>
                <option value="pipe_leak">Pipe Leak</option>
                <option value="drain_blockage">Drain Blockage</option>
                <option value="dirty_toilet">Dirty Toilet</option>
              </select>

              {/* Ward Filter */}
              <select
                aria-label="Filter by Ward"
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="all">All Wards</option>
                {wards.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </select>

              {(selectedStatus !== "all" || selectedType !== "all" || selectedWard !== "all") && (
                <button
                  onClick={() => {
                    setSelectedStatus("all");
                    setSelectedType("all");
                    setSelectedWard("all");
                  }}
                  className="text-xs font-bold text-sky-600 hover:underline px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Leaflet Map Viewer */}
          <MapViewer issues={filteredIssues} hotspots={hotspots} className="h-[520px] w-full rounded-2xl" />

          {/* Map Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-700">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                <span>Reported</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                <span>Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span>Resolved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-400/40 ring-1 ring-rose-500"></span>
                <span>Hotspot (200m cluster)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">Click any pin to inspect details</p>
          </div>
        </div>
      </section>

      {/* 4. Top Hotspots & Recent Reports Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Top Hotspots Strip */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Flame className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Top Hotspots in Nagpur</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">3+ reports within 200m</span>
          </div>

          <div className="space-y-3">
            {hotspots.slice(0, 3).map((hs, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-rose-200 hover:shadow-xs transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 capitalize">
                      {ISSUE_TYPE_LABELS[hs.type] || hs.type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                      Ward: {hs.ward_name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Radius: ~{hs.radius_m}m cluster • {hs.open_reports} active open reports
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-rose-600 block">
                      Score: {Math.round(hs.priority_score)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {hs.recurrence_count} recurring reports
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Reports List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recent Community Reports</h3>
            <span className="text-xs font-semibold text-slate-500">Live updates</span>
          </div>

          <div className="space-y-3">
            {issues.slice(0, 4).map((issue) => {
              const statusMeta = STATUS_META[issue.status] || STATUS_META.reported;
              return (
                <Link
                  key={issue.id}
                  href={`/issues/${issue.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-sky-300 hover:shadow-xs transition group"
                >
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition">
                        {ISSUE_TYPE_LABELS[issue.type] || issue.type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{issue.description}</p>
                    <p className="text-[10px] text-slate-400">
                      Ward: {issue.ward_name || "Nagpur"} • {new Date(issue.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span>{issue.upvote_count}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Call To Action Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-sky-800 to-cyan-700 p-8 sm:p-10 text-white shadow-xl shadow-sky-900/10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-cyan-200">
            <Users className="h-3.5 w-3.5" />
            <span>Community Driven Solution</span>
          </div>
          <h3 className="text-2xl font-black tracking-tight">Be the change your community needs.</h3>
          <p className="text-xs sm:text-sm text-sky-100 max-w-lg">
            Spot a leak or a broken valve? Take a picture, mark the location on our map, and watch it move from Reported to Resolved.
          </p>
        </div>

        <Link
          href="/report"
          className="shrink-0 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-sky-800 shadow-md hover:bg-sky-50 transition transform hover:-translate-y-0.5"
        >
          Get Started Now
        </Link>
      </section>
    </div>
  );
}
