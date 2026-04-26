import { Inbox, PhoneCall } from "lucide-react";

import { LeadForm } from "@/components/lead-form";
import { contactDetails } from "@/lib/constants";

export function LeadSection() {
  return (
    <section id="lead-form" className="section-pad">
      <div className="container-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] bg-[linear-gradient(135deg,#0f5db8_0%,#0a2f5e_100%)] p-8 text-white shadow-soft md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">Lead Form</p>
          <h2 className="mt-4 text-3xl font-black md:text-4xl">Call karein ya WhatsApp par message bhejein</h2>
          <p className="mt-4 max-w-xl text-base leading-8 text-white/80">
            Inquiry submit karein aur team aapse jaldi contact karegi. Admin-friendly lead capture Supabase integration ke saath ready hai.
          </p>
          <div className="mt-8 space-y-4">
            <a href={`tel:${contactDetails.phone}`} className="flex items-center gap-3 text-white/90">
              <PhoneCall className="h-5 w-5" />
              {contactDetails.phone}
            </a>
            <a href={`mailto:${contactDetails.email}`} className="flex items-center gap-3 text-white/90">
              <Inbox className="h-5 w-5" />
              {contactDetails.email}
            </a>
          </div>
        </div>
        <div className="rounded-[2rem] border bg-white/90 p-6 shadow-soft md:p-8">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
