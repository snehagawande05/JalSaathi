"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Edit3,
  ClipboardList,
  Info,
  ShieldAlert,
  Search,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Droplets,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/report", label: "Report Issue", icon: Edit3 },
    { href: "/my-reports", label: "My Reports", icon: ClipboardList },
    { href: "/about", label: "About", icon: Info },
  ];

  if (user?.role === "admin") {
    navLinks.push({ href: "/admin", label: "Admin Portal", icon: ShieldAlert });
  }

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1536px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Logo & Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
            <Droplets className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                JalSaathi
              </span>
              {user?.role === "admin" && (
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500">Clean Water • Healthy Communities</p>
          </div>
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                  active
                    ? "bg-sky-600 text-white shadow-sm shadow-sky-500/25"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side: Search, Notification, Profile */}
        <div className="hidden md:flex items-center gap-3">
          {/* Quick Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search issues, locations..."
              className="w-52 rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>

          {/* Bell Icon */}
          <button
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>

          {/* User Auth Info */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50 transition shadow-xs"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold text-xs">
                  {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-slate-900 max-w-[120px] truncate">
                    {user.full_name || user.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 capitalize">{user.role}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl ring-1 ring-black/5 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/my-reports"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <ClipboardList className="h-4 w-4 text-slate-400" />
                    <span>My Reports</span>
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/20 hover:bg-sky-500 transition"
            >
              <User className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  active ? "bg-sky-50 text-sky-600" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-sky-600" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                <User className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
