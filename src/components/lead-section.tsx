import { Inbox, PhoneCall } from "lucide-react";

import { LeadForm } from "@/components/lead-form";
import { contactDetails } from "@/lib/constants";

export function LeadSection() {
  return (
    <section id="lead-form" className="section-pad">
      <div className="container-shell grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl bg-[linear-gradient(135deg,#0f5db8_0%,#0a2f5e_100%)] p-6 text-white shadow-soft md:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-200">Lead Form</p>
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">Aaj hi apply karein - Fast service</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80">
            Inquiry submit karein aur team aapse jaldi contact karegi. Same day service available hai selected applications par.
          </p>
          <div className="mt-6 space-y-4">
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
        <div className="rounded-3xl border bg-white/90 p-5 shadow-soft md:p-7">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
