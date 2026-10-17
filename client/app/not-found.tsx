import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center space-y-4">
      <h2 className="text-3xl font-black text-slate-900">404 - Page Not Found</h2>
      <p className="text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="inline-flex items-center rounded-xl bg-cyan-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-cyan-800 transition"
      >
        Return to Home
      </Link>
    </div>
  );
}
