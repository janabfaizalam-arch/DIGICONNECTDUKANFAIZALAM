import { MessageCircleMore, PhoneCall } from "lucide-react";

import { contactDetails, createWhatsappLink } from "@/lib/constants";

export function StickyMobileCta() {
  return (
    <>
      <a
        href={createWhatsappLink("Floating WhatsApp")}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp DigiConnect Dukan"
        className="fixed bottom-24 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl md:bottom-6 md:h-14 md:w-14"
      >
        <MessageCircleMore className="h-6 w-6 md:h-7 md:w-7" />
      </a>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
          <a
            href={`tel:${contactDetails.officePhone}`}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-[var(--primary)] px-2 py-2 text-center text-xs font-bold leading-tight text-white min-[380px]:text-sm"
          >
            <PhoneCall className="h-4 w-4 shrink-0" />
            Call Now: {contactDetails.officePhone}
          </a>
          <a
            href={createWhatsappLink("Sticky Mobile CTA")}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-[var(--secondary)] px-2 py-2 text-center text-xs font-bold leading-tight text-white min-[380px]:text-sm"
          >
            <MessageCircleMore className="h-4 w-4 shrink-0" />
            WhatsApp Now
          </a>
        </div>
      </div>
    </>
  );
}
