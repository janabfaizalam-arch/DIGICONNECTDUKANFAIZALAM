import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, LogIn, Menu, MessageCircleMore, PhoneCall } from "lucide-react";

import { contactDetails, createWhatsappLink } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/services", label: "Apply Now" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const authHref = user ? "/dashboard" : "/login";
  const authLabel = user ? "Dashboard" : "Login";
  const AuthIcon = user ? LayoutDashboard : LogIn;

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur-xl">
      <div className="container-shell flex min-h-16 items-center justify-between gap-4 py-2">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="DigiConnect Dukan home">
          <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
            <Image
              src="/digiconnect-logo.png"
              alt="DigiConnect Dukan Logo"
              width={64}
              height={40}
              priority
              className="h-9 w-12 object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950 sm:text-base">DigiConnect Dukan</p>
            <p className="hidden text-xs text-slate-500 sm:block">Digital & Government Services</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-[var(--primary)]">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link href={authHref} className={buttonVariants({ variant: "outline", size: "default" })}>
            <AuthIcon className="h-4 w-4" />
            {authLabel}
          </Link>
          <a href={`tel:${contactDetails.officePhone}`}>
            <Button size="default">
              <PhoneCall className="h-4 w-4" />
              Call Now
            </Button>
          </a>
        </div>
        <details className="group relative md:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border bg-white text-[var(--primary)] shadow-sm marker:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation menu</span>
          </summary>
          <div className="absolute right-0 top-14 w-72 rounded-2xl border bg-white p-3 shadow-soft">
            <nav className="grid gap-1 text-sm font-semibold text-slate-700">
              {navLinks.map((link) => (
                <Link key={link.label} href={link.href} className="rounded-xl px-4 py-3 hover:bg-[var(--muted)] hover:text-[var(--primary)]">
                  {link.label}
                </Link>
              ))}
              <Link href={authHref} className="rounded-xl px-4 py-3 hover:bg-[var(--muted)] hover:text-[var(--primary)]">
                {authLabel}
              </Link>
            </nav>
            <div className="mt-3 grid gap-2 border-t pt-3">
              <a
                href={createWhatsappLink("Mobile Navbar")}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--secondary)] px-4 text-sm font-bold text-white"
              >
                <MessageCircleMore className="h-4 w-4" />
                WhatsApp Now
              </a>
              <a
                href={`tel:${contactDetails.officePhone}`}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white"
              >
                <PhoneCall className="h-4 w-4" />
                Call Now
              </a>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
