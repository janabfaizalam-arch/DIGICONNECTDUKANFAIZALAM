import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">
          <span className="text-3xl font-black text-slate-400">404</span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Page Not Found</h1>
        <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 text-sm font-extrabold text-white shadow-md shadow-blue-500/10 transition active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <Link
            href="/services"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse Services
          </Link>
        </div>
      </div>
    </div>
  );
}
