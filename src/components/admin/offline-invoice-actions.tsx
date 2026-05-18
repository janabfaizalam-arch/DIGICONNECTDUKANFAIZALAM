"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Eye, LoaderCircle, Pencil, Printer, Trash2 } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";

export function OfflineInvoicePrintActions({ invoiceId }: { invoiceId: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("print") === "1") {
      window.setTimeout(() => window.print(), 350);
    }
  }, [searchParams]);

  return (
    <div data-print-hide className="flex flex-wrap justify-end gap-2">
      <Button type="button" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print
      </Button>
      <a
        href={`/api/admin/offline-invoices/${invoiceId}/pdf`}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-white/80 px-5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </a>
    </div>
  );
}

export function OfflineInvoiceRowActions({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  function deleteInvoice() {
    if (!window.confirm("Delete this offline invoice?")) return;

    startTransition(async () => {
      const response = await fetch(`/api/admin/offline-invoices/${invoiceId}`, { method: "DELETE" });
      if (response.ok) {
        success("Offline invoice deleted.");
        router.refresh();
      } else {
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        toastError(result.message ?? "Offline invoice could not be deleted.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/admin/offline-invoices/${invoiceId}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
        <Eye className="h-3.5 w-3.5" />
        View
      </Link>
      <Link href={`/admin/offline-invoices/${invoiceId}?print=1`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
        <Printer className="h-3.5 w-3.5" />
        Print
      </Link>
      <a href={`/api/admin/offline-invoices/${invoiceId}/pdf`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
        <Download className="h-3.5 w-3.5" />
        PDF
      </a>
      <Link href={`/admin/offline-invoices/${invoiceId}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Link>
      <button
        type="button"
        onClick={deleteInvoice}
        disabled={isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-100 bg-white px-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete
      </button>
    </div>
  );
}
