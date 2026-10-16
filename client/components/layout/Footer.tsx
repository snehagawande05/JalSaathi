import React from "react";
import Link from "next/link";
import { Droplets } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1536px] flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-sm shadow-sky-500/20">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-900 tracking-tight">JalSaathi</span>
            <p className="text-xs text-slate-500">Clean Water • Healthy Communities</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/" className="transition hover:text-sky-600">
            Home
          </Link>
          <Link href="/report" className="transition hover:text-sky-600">
            Report Issue
          </Link>
          <Link href="/my-reports" className="transition hover:text-sky-600">
            My Reports
          </Link>
          <Link href="/about" className="transition hover:text-sky-600">
            About
          </Link>
        </nav>

        <p className="text-xs text-slate-500 text-center sm:text-right">
          Together for cleaner water and healthier communities.
        </p>
      </div>
    </footer>
  );
}
