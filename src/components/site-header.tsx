import Link from "next/link";
import { PhoneCall } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur-xl">
      <div className="container-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-lg font-bold text-white">
            D
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">DigiConnect Dukan</p>
            <p className="text-xs text-slate-500">Powered by RNoS India Pvt Ltd</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="#services" className="hover:text-[var(--primary)]">
            Services
          </Link>
          <Link href="#process" className="hover:text-[var(--primary)]">
            Process
          </Link>
          <Link href="#lead-form" className="hover:text-[var(--primary)]">
            Apply Now
          </Link>
          <Link href="#contact" className="hover:text-[var(--primary)]">
            Contact
          </Link>
        </nav>
        <a href={`tel:${contactDetails.phone}`} className="hidden md:block">
          <Button size="default">
            <PhoneCall className="h-4 w-4" />
            Call Now
          </Button>
        </a>
      </div>
    </header>
  );
}
