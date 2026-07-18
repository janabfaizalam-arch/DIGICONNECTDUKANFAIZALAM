import Link from "next/link";

const links = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/track", label: "Track" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          DigiConnect Dukan
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] sm:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[var(--fg)]">
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-full bg-[var(--fg)] px-3 py-1.5 text-[var(--bg)] hover:opacity-90"
          >
            Login
          </Link>
        </nav>
        <Link href="/login" className="text-sm sm:hidden">
          Login
        </Link>
      </div>
    </header>
  );
}
