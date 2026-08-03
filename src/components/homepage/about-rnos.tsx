import Link from "next/link";
import { Building2, MapPin } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import { HomepageSection } from "@/components/homepage/ui";

export function AboutRnos() {
  return (
    <HomepageSection id="about" surface="navy" aria-labelledby="about-heading">
      <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[var(--dc-orange-400)]">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Company
          </p>
          <h2 id="about-heading" className="mt-2 text-[1.65rem] font-black tracking-tight text-white sm:text-[2rem] md:text-[2.25rem]">
            About RNOS / DigiConnect Dukan
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] font-semibold leading-relaxed text-white/90 sm:text-base">
            DigiConnect Dukan is the customer-facing digital assistance brand of{" "}
            <strong className="font-extrabold text-white">RNOS India Private Limited</strong>. We help individuals and
            businesses with online form submission support for tax, business, identity, insurance, and selected government
            schemes — as a private assistance platform, not an official government portal.
          </p>
          <ul className="mt-5 space-y-2 text-sm font-semibold text-white/85 sm:text-[15px]">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dc-orange-400)]" aria-hidden="true" />
              Service coverage: {contactDetails.availability}
            </li>
            <li>
              Support:{" "}
              <a className="font-bold text-[var(--dc-orange-400)] hover:underline" href={`mailto:${contactDetails.email}`}>
                {contactDetails.email}
              </a>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link href="/about" className="inline-flex min-h-11 items-center text-sm font-bold text-white hover:underline">
              More about us
            </Link>
            <Link href="/privacy-policy" className="inline-flex min-h-11 items-center text-sm font-bold text-white/80 hover:underline">
              Privacy policy
            </Link>
            <Link href="/terms-and-conditions" className="inline-flex min-h-11 items-center text-sm font-bold text-white/80 hover:underline">
              Terms
            </Link>
          </div>
        </div>
        <div className="rounded-[var(--dc-card-radius)] border border-white/15 bg-white/10 p-5">
          <span className="inline-flex rounded-xl bg-white px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-navbar.png" alt="DigiConnect Dukan" className="h-9 w-auto" />
          </span>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/85">
            Connecting people with private digital assistance across India. Documents are handled carefully; payments use
            Razorpay where checkout applies.
          </p>
        </div>
      </div>
    </HomepageSection>
  );
}
