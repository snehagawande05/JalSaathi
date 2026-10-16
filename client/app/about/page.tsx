import React from "react";
import Link from "next/link";
import {
  Target,
  Eye,
  AlertTriangle,
  MapPin,
  Search,
  Users,
  ShieldCheck,
  Droplets,
  HeartHandshake,
  Building2,
  Leaf,
  ArrowRight,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-12">
      {/* 1. Hero Header */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-50 via-white to-cyan-50/60 p-8 sm:p-12 border border-sky-100 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">About JalSaathi</span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Cleaner Water. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-cyan-500">
              Healthier Communities.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            JalSaathi is a community-driven civic platform that empowers residents of Nagpur to report water and sanitation problems with exact map pins, tracks resolution progress with public transparency, and enables municipal engineers to detect recurring hotspots and prioritize urgent repairs.
          </p>
        </div>

        <div className="shrink-0 flex items-center justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-xl shadow-sky-500/25">
            <Droplets className="h-16 w-16" />
            <span className="absolute -bottom-3 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold text-cyan-300">
              YCCE NSS PS-05
            </span>
          </div>
        </div>
      </div>

      {/* 2. Mission & Vision Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Target className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Our Mission</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            To build a transparent, tamper-proof and efficient record that empowers local citizens to report sanitation issues, ensures prompt municipal accountability, and eliminates recurring pipe bursts and drainage contamination in urban neighborhoods.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <Eye className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Our Vision</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            A future where every ward has reliable clean drinking water, sanitary streets free of overflow, and an intelligent spatial system that identifies root-cause pipeline deterioration before it leads to public health hazards.
          </p>
        </div>
      </div>

      {/* 3. The Problem & What We Do Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* The Problem */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">The Problem Statement</h3>
              <p className="text-xs text-slate-500">Communities face persistent water & sanitation barriers</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            In many Indian cities, pipeline leaks and drainage blockages happen at the same spots over and over again. Citizens call or complain individually, but there is no reliable shared civic map to show whether a problem was verified or who is working on it.
          </p>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Without spatial aggregation, municipal crews fix symptoms rather than root causes. JalSaathi solves this by using PostGIS DBSCAN spatial clustering to flag hotspots (3+ reports within 200m in 30 days) and priority-sorts maintenance work orders.
          </p>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Hackathon Theme: Social Welfare & Community Impact</span>
            <span className="font-bold text-sky-600">PS 05 Solution</span>
          </div>
        </div>

        {/* What We Do */}
        <div className="lg:col-span-5 rounded-3xl border border-sky-100 bg-gradient-to-b from-sky-50/50 to-white p-6 sm:p-8 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-slate-900">What We Do</h3>

          <div className="space-y-4">
            {[
              {
                icon: MapPin,
                title: "Report Issues",
                desc: "Easily report water outages, leaks, and blocked sewers with exact map pins.",
              },
              {
                icon: Search,
                title: "Track Progress",
                desc: "Stay updated on verified status changes from Reported to Resolved.",
              },
              {
                icon: Users,
                title: "Detect Hotspots",
                desc: "Identify recurring failure points so engineers fix pipelines, not just symptoms.",
              },
              {
                icon: ShieldCheck,
                title: "Enable Better Decisions",
                desc: "Equip ward authorities with priority ranking and SLA turnarounds.",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                    <p className="text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. How It Works (4 Steps) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900">How It Works</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: "1",
              title: "Pin & Report",
              desc: "Citizens drop a pin on the map, describe the issue, and optionally attach a photo.",
            },
            {
              step: "2",
              title: "Smart Deduplication",
              desc: "The system checks for nearby open issues within 50m to avoid duplicate spam.",
            },
            {
              step: "3",
              title: "Cluster & Prioritize",
              desc: "PostGIS DBSCAN calculates recurrence and orders maintenance tickets by urgency.",
            },
            {
              step: "4",
              title: "Action & Resolution",
              desc: "Field crews repair the fault, log notes, and the citizen receives resolution updates.",
            },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-xs">
                {item.step}
              </span>
              <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Four Core Pillars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Droplets,
            title: "Clean Water",
            desc: "Reduces wastage from unattended main pipe bursts.",
          },
          {
            icon: HeartHandshake,
            title: "Healthy Communities",
            desc: "Prevents water contamination and waterborne illnesses.",
          },
          {
            icon: Building2,
            title: "Transparent Governance",
            desc: "Builds public trust through open civic status tracking.",
          },
          {
            icon: Leaf,
            title: "Sustainable Cities",
            desc: "Fosters long-term resilient municipal infrastructure.",
          },
        ].map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-100 text-center space-y-2 shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 mx-auto">
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">{pillar.title}</h4>
              <p className="text-[11px] text-slate-500">{pillar.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-4">
        <Link
          href="/report"
          className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-500 transition"
        >
          <span>Report an Issue in Your Neighborhood</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
