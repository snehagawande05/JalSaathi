import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/authContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JalSaathi — Community Water & Sanitation Platform",
  description: "Report issues with a map pin, track status resolution, and help eliminate recurring water & sanitation hotspots in Nagpur.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50/70 text-slate-900 min-h-screen flex flex-col antialiased`}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
