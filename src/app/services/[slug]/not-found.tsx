import Link from "next/link";
import { Search, ArrowLeft } from "lucide-react";

export default function ServiceNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 border border-orange-100">
          <Search className="h-10 w-10 text-orange-500" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Service Not Found</h1>
        <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">
          This service may have been renamed, moved, or is no longer available.
          <br />
          Please browse our available services below.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/services"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 text-sm font-extrabold text-white shadow-md shadow-blue-500/10 transition active:scale-[0.98]"
          >
            View All Services
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
