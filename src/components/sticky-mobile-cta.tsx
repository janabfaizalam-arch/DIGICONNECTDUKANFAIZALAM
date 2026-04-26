import { MessageCircleMore, PhoneCall } from "lucide-react";

import { contactDetails } from "@/lib/constants";

export function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 p-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg gap-3">
        <a
          href={`tel:${contactDetails.phone}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white"
        >
          <PhoneCall className="h-4 w-4" />
          Call Now
        </a>
        <a
          href={`https://wa.me/${contactDetails.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--secondary)] px-4 py-3 text-sm font-semibold text-white"
        >
          <MessageCircleMore className="h-4 w-4" />
          WhatsApp Now
        </a>
      </div>
    </div>
  );
}
