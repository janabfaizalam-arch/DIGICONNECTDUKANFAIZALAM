import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

import { ADMIN_AGENCY_PARTNERS_ROUTE } from "@/lib/admin/agency-partner-routes";

type PartnerNotFoundProps = {
  reason?: "missing" | "malformed" | "unavailable";
};

/**
 * Premium admin-scoped empty state for missing/invalid partner detail routes.
 * Must never fall through to the public marketing 404.
 */
export function AdminPartnerNotFound({ reason = "missing" }: PartnerNotFoundProps) {
  const description =
    reason === "malformed"
      ? "The partner link is invalid or incomplete. Use Search Again from the partners console."
      : reason === "unavailable"
        ? "The partner data service is temporarily unavailable. Try again in a moment."
        : "This partner record could not be located. It may have been deleted or the link is outdated.";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-400 shadow-sm">
        <span className="text-xl font-black tracking-tight">404</span>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Partner Not Found</h1>
      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">{description}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href={ADMIN_AGENCY_PARTNERS_ROUTE}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Partners
        </Link>
        <Link
          href={`${ADMIN_AGENCY_PARTNERS_ROUTE}?q=`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Search className="h-4 w-4 text-indigo-500" />
          Search Again
        </Link>
      </div>
    </div>
  );
}
