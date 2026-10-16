import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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
          <Navbar />
          <main className="flex-1 w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
