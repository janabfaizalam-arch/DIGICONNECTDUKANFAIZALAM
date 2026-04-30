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
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl md:bottom-6"
      >
        <MessageCircleMore className="h-7 w-7" />
      </a>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg gap-3">
          <a
            href={`tel:${contactDetails.officePhone}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white"
          >
            <PhoneCall className="h-4 w-4" />
            Call Now: {contactDetails.officePhone}
          </a>
          <a
            href={createWhatsappLink("Sticky Mobile CTA")}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--secondary)] px-4 py-3 text-sm font-semibold text-white"
          >
            <MessageCircleMore className="h-4 w-4" />
            WhatsApp Now
          </a>
        </div>
      </div>
    </>
  );
}
