"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, MessageCircle, Phone, Printer } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import {
  createInsuranceQuotationWhatsappText,
  type InsuranceQuotation,
  type InsuranceQuotationStatus,
} from "@/lib/insurance-quotations";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * What a customer can do with their quotation.
 *
 * "Accept Quotation" used to open WhatsApp with exactly the same prefilled
 * message as the "WhatsApp Now" button beside it — two controls, one
 * behaviour, and the acceptance recorded nowhere. It now posts to the
 * quotation's own token, sets the status, notifies the shop, and says so on
 * screen. WhatsApp is still there, as the separate thing it always was:
 * asking a question.
 *
 * The phone number comes from the shared contact details rather than being
 * typed in again, so it changes in one place.
 */
export function InsuranceQuotationActions({
  quotation,
  status,
  canAccept,
}: {
  quotation: InsuranceQuotation;
  status: InsuranceQuotationStatus;
  canAccept: boolean;
}) {
  const whatsappUrl = buildWhatsAppUrl(createInsuranceQuotationWhatsappText(quotation));
  const [accepted, setAccepted] = useState(status === "accepted");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/insurance-quotation/${quotation.public_token}/accept`, {
        method: "POST",
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || "Accept nahi ho paya. Ek baar phir try kijiye.");
        return;
      }
      setAccepted(true);
    } catch {
      // A dropped connection is the likeliest failure here, and it used to
      // produce nothing at all.
      setError("Network nahi mila. Ek baar phir try kijiye, ya WhatsApp par bata dijiye.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {accepted ? (
        <p className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3.5 text-[13.5px] font-bold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          Aapne yeh quotation accept kar li hai. Hum jald hi aapse sampark karenge — koi sawal ho to
          WhatsApp kar dijiye.
        </p>
      ) : (
        <p className="text-[13.5px] font-bold text-slate-900">Is quotation par aage badhna hai?</p>
      )}

      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {canAccept && !accepted ? (
          <button
            type="button"
            onClick={() => void accept()}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-[14px] font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            {busy ? "Ho raha hai…" : "Accept quotation"}
          </button>
        ) : null}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[14px] font-bold text-white transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp par poochhiye
        </a>

        <a
          href={`tel:+91${contactDetails.primaryPhone}`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-bold text-slate-900 transition hover:border-slate-300"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Call +91 {contactDetails.primaryPhone}
        </a>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-bold text-slate-900 transition hover:border-slate-300"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print / PDF
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-bold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
