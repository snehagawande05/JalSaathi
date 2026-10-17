"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, ShieldCheck, UserCheck, ArrowRight, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useAuth, DEMO_ACCOUNTS } from "@/lib/authContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  if (user) {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Already Signed In</h2>
          <p className="mt-2 text-sm text-slate-600">
            You are logged in as <span className="font-semibold">{user.full_name || user.email}</span> ({user.role}).
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push(user.role === "admin" ? "/admin" : "/")}
              className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition"
            >
              Go to {user.role === "admin" ? "Admin Portal" : "Home Platform"}
            </button>
            <button
              onClick={() => router.push("/my-reports")}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              View My Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const profile = await login(email, password);
      if (profile?.role === "admin" || email.toLowerCase().includes("admin")) {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (key: keyof typeof DEMO_ACCOUNTS) => {
    setError(null);
    setQuickLoading(key);
    try {
      await quickLogin(key);
      const acc = DEMO_ACCOUNTS[key];
      router.push(acc.role === "admin" ? "/admin" : "/");
    } catch (err: any) {
      setError(err?.message || "Demo login failed.");
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-md shadow-sky-500/20 mb-4">
          <Droplets className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Sign in to JalSaathi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track issues, report water and sanitation outages, or manage municipal priority queues.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 1-Click Demo Accounts */}
        <div className="lg:col-span-5 order-2 lg:order-1 space-y-4">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-bold">
                ⚡
              </span>
              <h2 className="text-base font-bold text-slate-900">1-Click Hackathon Demo Login</h2>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Select any pre-configured role to instantly test permissions, workflows, and dashboards.
            </p>

            <div className="space-y-3">
              {/* Admin Card */}
              <button
                type="button"
                disabled={Boolean(quickLoading)}
                onClick={() => handleQuickLogin("admin")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-amber-200 bg-white hover:border-amber-400 hover:shadow-sm text-left transition group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">Demo Admin</p>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Admin
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Access priority queues, stats & status updates</p>
                  </div>
                </div>
                {quickLoading === "admin" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition" />
                )}
              </button>

              {/* Citizen 1 */}
              <button
                type="button"
                disabled={Boolean(quickLoading)}
                onClick={() => handleQuickLogin("citizen1")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm text-left transition group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition">Asha Patil</p>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        Citizen
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">23 historical reports & upvotes</p>
                  </div>
                </div>
                {quickLoading === "citizen1" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 transition" />
                )}
              </button>

              {/* Citizen 2 */}
              <button
                type="button"
                disabled={Boolean(quickLoading)}
                onClick={() => handleQuickLogin("citizen2")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm text-left transition group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-cyan-600 transition">Rohan Deshmukh</p>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        Citizen
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Active citizen in Nagpur West</p>
                  </div>
                </div>
                {quickLoading === "citizen2" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Manual Sign-In Form */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Standard Login</h2>
            <p className="text-xs text-slate-500 mb-6">Enter your registered email address and password.</p>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/20 hover:bg-sky-500 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
