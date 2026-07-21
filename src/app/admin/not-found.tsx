import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Admin-scoped not-found — stays inside AdminShell (never public marketing 404). */
export default function AdminNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-400 shadow-sm">
        <span className="text-xl font-black tracking-tight">404</span>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Page not found</h1>
      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
        This admin page does not exist or the resource could not be located.
      </p>
      <Link
        href="/admin"
        className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>
    </div>
  );
}
