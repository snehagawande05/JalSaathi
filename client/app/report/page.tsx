"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Droplets,
  Wrench,
  AlertTriangle,
  Sparkles,
  MapPin,
  UploadCloud,
  X,
  Send,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Camera,
  Info,
  ThumbsUp,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { NAGPUR_CENTER } from "@/lib/constants";
import { apiFetch, API_URL } from "@/lib/api";
import type { IssueType, DuplicateCheckResult } from "@/lib/types";

const LocationPickerMap = dynamic(() => import("@/components/map/LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
      <span className="text-xs font-semibold">Loading Nagpur coordinate picker...</span>
    </div>
  ),
});

const ISSUE_OPTIONS: { type: IssueType; label: string; icon: any; desc: string }[] = [
  {
    type: "water_interruption",
    label: "Water Supply Interruption",
    icon: Droplets,
    desc: "No water supply or low pressure",
  },
  {
    type: "pipe_leak",
    label: "Pipe Leak",
    icon: Wrench,
    desc: "Burst pipe, leaking mainline or joint",
  },
  {
    type: "drain_blockage",
    label: "Drain Blockage",
    icon: AlertTriangle,
    desc: "Clogged sewer, overflow on road",
  },
  {
    type: "dirty_toilet",
    label: "Dirty Public Toilet",
    icon: Sparkles,
    desc: "Sanitation or hygiene problem",
  },
];

export default function ReportPage() {
  const router = useRouter();
  const { user, quickLogin } = useAuth();

  const [type, setType] = useState<IssueType>("water_interruption");
  const [description, setDescription] = useState("");
  const [addressText, setAddressText] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: NAGPUR_CENTER.lat,
    lng: NAGPUR_CENTER.lng,
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Duplicate check
  const [duplicates, setDuplicates] = useState<DuplicateCheckResult[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Check for duplicates when type or coords change
  const runDuplicateCheck = useCallback(async (lat: number, lng: number, selectedType: IssueType) => {
    setCheckingDuplicates(true);
    try {
      const res = await apiFetch<DuplicateCheckResult[]>("/api/issues/check-duplicate", {
        method: "POST",
        body: JSON.stringify({
          lat,
          lng,
          type: selectedType,
          radius_m: 100,
        }),
      });
      setDuplicates(res || []);
    } catch {
      setDuplicates([]);
    } finally {
      setCheckingDuplicates(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runDuplicateCheck(coords.lat, coords.lng, type);
    }, 600);
    return () => clearTimeout(timer);
  }, [coords.lat, coords.lng, type, runDuplicateCheck]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 2 * 1024 * 1024) {
      alert("File size must be under 2 MB.");
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please sign in or use 1-click citizen demo login to submit reports.");
      return;
    }

    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("description", description.trim());
      formData.append("lat", String(coords.lat));
      formData.append("lng", String(coords.lng));
      if (addressText.trim()) formData.append("address_text", addressText.trim());
      if (file) formData.append("photo", file);

      // Call Express API
      const token = (await import("@/lib/supabase")).supabase;
      const { data: s } = await token.auth.getSession();
      const accessToken = s.session?.access_token;

      const res = await fetch(`${API_URL}/api/issues`, {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to create issue");
      }

      setSuccessId(json.data.id);
    } catch (err: any) {
      setError(err?.message || "Failed to submit issue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setCoords({ lat, lng });
        },
        () => {
          alert("Could not access your location. Using Nagpur default pin.");
        }
      );
    }
  };

  if (successId) {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Issue Reported Successfully!</h2>
          <p className="text-sm text-slate-600">
            Your report has been submitted to the Nagpur ward maintenance queue with status{" "}
            <span className="font-semibold text-rose-600">Reported</span>.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/issues/${successId}`}
              className="flex-1 rounded-2xl bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-500 transition shadow-sm"
            >
              View Report Details
            </Link>
            <Link
              href="/my-reports"
              className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Track in My Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-50 via-white to-cyan-50/50 p-6 sm:p-8 border border-sky-100/80 flex items-center gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-md shadow-sky-500/20">
          <MapPin className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Report an Issue</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
            Help us keep Nagpur&apos;s water and sanitation systems clean and working. Mark the location on the map, select the issue type, and submit details.
          </p>
        </div>
      </div>

      {/* Guest warning banner with 1-click citizen login */}
      {!user && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Info className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              You are browsing as a <strong>Guest</strong>. To submit this report, sign in or use 1-click citizen demo login.
            </span>
          </div>
          <button
            type="button"
            onClick={() => quickLogin("citizen1")}
            className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-1.5 font-bold text-white hover:bg-amber-500 transition shadow-xs"
          >
            ⚡ 1-Click Citizen Login (Asha)
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Main 3-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Map Pin Picker */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-sky-600" />
                <span>Mark Issue Location</span>
              </span>
              <button
                type="button"
                onClick={handleUseGps}
                className="text-[11px] font-bold text-sky-600 hover:underline"
              >
                Use My GPS
              </button>
            </div>

            {/* Map */}
            <LocationPickerMap
              lat={coords.lat}
              lng={coords.lng}
              onChange={(newCoords) => setCoords(newCoords)}
              className="h-[360px] w-full rounded-2xl"
            />

            {/* Selected Location Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Selected Location</p>
                <p className="text-xs font-extrabold text-slate-900">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
                <p className="text-[11px] text-slate-500">Nagpur, Maharashtra (Auto-assigns nearest ward)</p>
              </div>

              <button
                type="button"
                onClick={handleUseGps}
                className="shrink-0 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                Reposition
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column: Form Details */}
        <div className="lg:col-span-4">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Issue Details</h2>
              <p className="text-xs text-slate-500">Select the issue category and provide details.</p>
            </div>

            {/* Issue Type Selector (Cards) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Issue Type *</label>
              <div className="grid grid-cols-2 gap-2.5">
                {ISSUE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = type === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setType(opt.type)}
                      className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all text-xs ${
                        isSelected
                          ? "border-sky-500 bg-sky-50/60 text-sky-800 font-bold ring-2 ring-sky-500/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <Icon className={`h-6 w-6 mb-1.5 ${isSelected ? "text-sky-600" : "text-slate-400"}`} />
                      <span className="leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duplicate detection warning */}
            {duplicates.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Nearby Similar Issue Found ({Math.round(duplicates[0].distance_m)}m away)</span>
                </div>
                <p className="text-[11px] text-amber-800 line-clamp-2">
                  &ldquo;{duplicates[0].description}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-amber-700">
                    Status: <strong className="capitalize">{duplicates[0].status}</strong>
                  </span>
                  <Link
                    href={`/issues/${duplicates[0].id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-500 transition shadow-2xs"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>Upvote Existing</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Description Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Description *</label>
                <span className={`text-[11px] ${description.length > 500 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                  {description.length}/500
                </span>
              </div>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail (10 - 500 characters)... e.g. pipeline cracked near junction."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            {/* Address / Landmark */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Address / Landmark (optional)</label>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="House number, landmark, colony..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            {/* Photo Upload Box */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Add Photo (optional)</label>
              {previewUrl ? (
                <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 h-32 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-sky-300 bg-slate-50/50 hover:bg-sky-50/20 transition cursor-pointer">
                  <UploadCloud className="h-7 w-7 text-sky-600 mb-1" />
                  <p className="text-xs font-bold text-slate-700">Click to upload photo</p>
                  <p className="text-[10px] text-slate-400">JPG, PNG, WEBP (max 2 MB)</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/25 hover:bg-sky-500 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting to Ward Queue...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Tips & Guidelines */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-3xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-6 shadow-xs space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 mx-auto">
              <Droplets className="h-6 w-6" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-slate-900">Together for cleaner water and healthier communities</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Your report provides verifiable data for municipal repair planning.
              </p>
            </div>

            <div className="pt-2 space-y-3.5 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p>Use the map to mark the exact location of the issue.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Camera className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p>Add a clear photo if possible (helps repair crews act faster).</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p>Check for similar issues before submitting to avoid duplicates.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>Only genuine reports are accepted. Anti-spam limits apply.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-cyan-50/80 border border-cyan-100 p-3 text-center">
              <p className="text-xs font-bold text-cyan-900">💙 Your report makes a difference!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
