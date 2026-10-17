"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    // Dedicated standalone full-screen Admin Portal (no citizen navbar, no citizen footer)
    return <main className="w-full min-h-screen bg-slate-100/60 flex flex-col">{children}</main>;
  }

  // Standard citizen-facing public platform
  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <Footer />
    </>
  );
}
