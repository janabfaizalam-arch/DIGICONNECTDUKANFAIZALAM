"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { ArrowRight, ChevronDown, LayoutDashboard, LogIn, Menu, Search, X } from "lucide-react";

import { useAppSession } from "@/components/providers/session-provider";
import { StructureGlyph } from "@/components/home-launch/art";
import { STRUCTURES, type ModuleId, type ResolvedModule, type StructureId } from "@/lib/homepage/launch-catalog";

type NavLink = { label: string; href: string; note?: string };

type SearchEntry = { title: string; href: string; meta: string };

/** Tell the explorer which structure to open; it listens for this. */
export function selectStructure(id: StructureId) {
  window.dispatchEvent(new CustomEvent("rl:structure", { detail: id }));
}

function useDismiss(open: boolean, close: () => void, refs: React.RefObject<HTMLElement | null>[]) {
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (refs.some((ref) => ref.current?.contains(event.target as Node))) return;
      close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close, refs]);
}

/** Keep Tab inside a dialog and close it on Escape. */
function trapKeys(event: ReactKeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === "Escape") {
    event.stopPropagation();
    close();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'),
  ).filter((el) => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function HomeNav({
  resolved,
  catalogue,
}: {
  resolved: Record<ModuleId, ResolvedModule>;
  catalogue: { title: string; slug: string; priceLabel: string }[];
}) {
  const [solid, setSolid] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const drawerButton = useRef<HTMLButtonElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const { user, role, ready } = useAppSession();
  const menuId = useId();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setSolid(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const dismissRefs = useMemo(() => [navRef], []);
  useDismiss(openMenu !== null, closeMenu, dismissRefs);

  useEffect(() => {
    if (!drawer && !search) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawer, search]);

  // "/" opens search from anywhere on the page, as the old header did.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || /input|textarea|select/i.test(target.tagName) || target.isContentEditable) return;
      event.preventDefault();
      setSearch(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const linkFor = (id: ModuleId, fallback: string) => resolved[id]?.href ?? fallback;

  const menus: { key: string; label: string; links?: NavLink[]; href?: string; mega?: boolean }[] = [
    { key: "registration", label: "Company Registration", mega: true },
    { key: "structures", label: "Structures", href: "#compare" },
    { key: "packages", label: "Packages", href: "#packages" },
    {
      key: "tax",
      label: "Tax",
      links: [
        { label: "GST registration", href: linkFor("gst", "#addons"), note: "GSTIN application and follow-up" },
        { label: "GST return filing", href: linkFor("gst-returns", "#addons"), note: "Monthly or quarterly returns" },
        { label: "Udyam (MSME)", href: linkFor("msme", "#addons"), note: "Free government registration" },
        { label: "Startup India (DPIIT)", href: linkFor("startup-india", "#addons"), note: "Recognition for eligible startups" },
        { label: "Income tax returns", href: linkFor("itr", "#addons"), note: "For the business or proprietor" },
      ],
    },
    {
      key: "licences",
      label: "Licences",
      links: [
        { label: "FSSAI registration / licence", href: linkFor("fssai", "#addons"), note: "For every food business" },
        { label: "Importer Exporter Code", href: linkFor("iec", "#addons"), note: "To import or export goods" },
        { label: "Shops & Establishments", href: linkFor("shops-establishment", "#addons"), note: "State-specific registration" },
        { label: "ISO certification support", href: linkFor("iso", "#addons"), note: "Standards documentation" },
      ],
    },
    {
      key: "compliance",
      label: "Compliance",
      links: [
        { label: "Annual ROC compliance", href: linkFor("annual-compliance", "#addons"), note: "For companies, every year" },
        { label: "Accounting & bookkeeping", href: linkFor("accounting", "#addons"), note: "Books ready for returns and audit" },
        { label: "What recurs every year", href: "#journey", note: "The obligations after incorporation" },
        { label: "Cost of staying compliant", href: "#costs", note: "Recurring costs, explained" },
      ],
    },
    {
      key: "resources",
      label: "Resources",
      links: [
        { label: "Document checklist", href: "#documents", note: "What to keep ready, by structure" },
        { label: "Cost guide", href: "#costs", note: "Government fees vs service fees" },
        { label: "Guides", href: "#guides", note: "Explainers and articles" },
        { label: "FAQs", href: "#faq", note: "Answers before you apply" },
        { label: "Blog", href: "/blog", note: "All published articles" },
        { label: "Track an application", href: "/track-application", note: "See where yours stands" },
      ],
    },
  ];

  const accountHref =
    role === "admin" ? "/admin" : role === "agent" || role === "agency_partner" ? "/ap/dashboard" : "/customer/dashboard";

  const onTriggerKey = (event: ReactKeyboardEvent<HTMLButtonElement>, key: string) => {
    if (event.key === "Escape") {
      closeMenu();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpenMenu(key);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${CSS.escape(`${menuId}-${key}`)} a`)?.focus());
    }
  };

  const onPanelKey = (event: ReactKeyboardEvent<HTMLDivElement>, key: string) => {
    if (event.key === "Escape") {
      closeMenu();
      triggerRefs.current[key]?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a"));
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const megaPanel = (
    <>
      <div>
        {STRUCTURES.map((structure) => (
          <a
            key={structure.id}
            href="#structures"
            className="rl-menu-link"
            onClick={() => {
              selectStructure(structure.id);
              closeMenu();
            }}
          >
            <span className="rl-tab__glyph" style={{ width: 40, height: 40, background: "var(--rl-night-2)", flex: "none", borderRadius: 10, display: "grid", placeItems: "center", marginTop: 0 }}>
              <StructureGlyph id={structure.id} size={30} />
            </span>
            <span style={{ marginTop: 0 }}>
              <strong>{structure.name}</strong>
              <span>{structure.tagline}</span>
            </span>
          </a>
        ))}
      </div>
      <div className="rl-menu-aside">
        <a href="#builder" className="rl-menu-link" onClick={closeMenu}>
          <span style={{ marginTop: 0 }}>
            <strong>Build my company</strong>
            <span>Pick a structure and services, see the itemised cost.</span>
          </span>
        </a>
        <a href="#compare" className="rl-menu-link" onClick={closeMenu}>
          <span style={{ marginTop: 0 }}>
            <strong>Compare all five</strong>
            <span>Liability, ownership, tax and compliance side by side.</span>
          </span>
        </a>
        <a href="#documents" className="rl-menu-link" onClick={closeMenu}>
          <span style={{ marginTop: 0 }}>
            <strong>Document checklist</strong>
            <span>What to keep ready before you file.</span>
          </span>
        </a>
        <a href="#services" className="rl-menu-link" onClick={closeMenu}>
          <span style={{ marginTop: 0 }}>
            <strong>Registration services</strong>
            <span>Every incorporation service we list.</span>
          </span>
        </a>
      </div>
    </>
  );

  return (
    <>
      <nav ref={navRef} className="rl-nav" data-solid={solid || openMenu !== null ? "true" : "false"} aria-label="Main">
        <div className="rl-wrap rl-nav__bar">
          <Link href="/" className="rl-nav__logo" aria-label="RNOS DigiConnect Dukan, home">
            <span className="rl-nav__logo-plate">
              <Image src="/logo-navbar.png" alt="" width={112} height={32} priority style={{ height: 30, width: "auto" }} />
            </span>
            <span className="rl-nav__logo-text">
              RNOS
              <small>Business launch</small>
            </span>
          </Link>

          <ul className="rl-nav__menu">
            {menus.map((menu) => (
              <li key={menu.key} className="rl-nav__item">
                {menu.href ? (
                  <a className="rl-nav__trigger" href={menu.href} onClick={closeMenu}>
                    {menu.label}
                  </a>
                ) : (
                  <>
                    <button
                      ref={(node) => {
                        triggerRefs.current[menu.key] = node;
                      }}
                      type="button"
                      className="rl-nav__trigger"
                      aria-expanded={openMenu === menu.key}
                      aria-controls={`${menuId}-${menu.key}`}
                      onClick={() => setOpenMenu((current) => (current === menu.key ? null : menu.key))}
                      onKeyDown={(event) => onTriggerKey(event, menu.key)}
                    >
                      {menu.label}
                      <ChevronDown aria-hidden="true" />
                    </button>
                    {openMenu === menu.key ? (
                      <div
                        id={`${menuId}-${menu.key}`}
                        className={`rl-nav__panel${menu.mega ? " rl-nav__panel--mega" : ""}`}
                        onKeyDown={(event) => onPanelKey(event, menu.key)}
                      >
                        {menu.mega
                          ? megaPanel
                          : menu.links?.map((link) => (
                              <a key={link.label} href={link.href} className="rl-menu-link" onClick={closeMenu}>
                                <span style={{ marginTop: 0 }}>
                                  <strong>{link.label}</strong>
                                  {link.note ? <span>{link.note}</span> : null}
                                </span>
                              </a>
                            ))}
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>

          <div className="rl-nav__actions">
            <button ref={searchButton} type="button" className="rl-icon-btn" aria-label="Search services (press /)" onClick={() => setSearch(true)}>
              <Search aria-hidden="true" />
            </button>
            {ready && user ? (
              <Link href={accountHref} className="rl-btn rl-btn--ghost rl-btn--sm rl-nav__login">
                <LayoutDashboard aria-hidden="true" />
                Dashboard
              </Link>
            ) : (
              <Link href="/customer/login" className="rl-btn rl-btn--ghost rl-btn--sm rl-nav__login">
                <LogIn aria-hidden="true" />
                Log in
              </Link>
            )}
            <a href="#builder" className="rl-btn rl-btn--launch rl-btn--sm rl-nav__cta">
              Start Your Company
            </a>
            <button
              ref={drawerButton}
              type="button"
              className="rl-icon-btn rl-nav__burger"
              aria-label="Open menu"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
            >
              <Menu aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      {drawer ? (
        <MobileDrawer
          menus={menus}
          signedIn={Boolean(ready && user)}
          accountHref={accountHref}
          onClose={() => {
            setDrawer(false);
            drawerButton.current?.focus();
          }}
        />
      ) : null}

      {search ? (
        <SearchDialog
          catalogue={catalogue}
          onClose={() => {
            setSearch(false);
            searchButton.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

function Dialog({ label, className, onClose, children }: { label: string; className: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input, a[href], button")?.focus();
  }, []);
  return (
    <>
      <div className="rl-overlay" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={className} onKeyDown={(event) => trapKeys(event, onClose)}>
        {children}
      </div>
    </>
  );
}

function MobileDrawer({
  menus,
  signedIn,
  accountHref,
  onClose,
}: {
  menus: { key: string; label: string; links?: NavLink[]; href?: string; mega?: boolean }[];
  signedIn: boolean;
  accountHref: string;
  onClose: () => void;
}) {
  return (
    <Dialog label="Menu" className="rl-drawer" onClose={onClose}>
      <div className="rl-drawer__head">
        <strong>Menu</strong>
        <button type="button" className="rl-icon-btn" style={{ borderColor: "var(--rl-line)" }} aria-label="Close menu" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="rl-drawer__body">
        <div className="rl-drawer__group">
          <h3>Company registration</h3>
          {STRUCTURES.map((structure) => (
            <a
              key={structure.id}
              href="#structures"
              onClick={() => {
                selectStructure(structure.id);
                onClose();
              }}
            >
              {structure.name}
            </a>
          ))}
        </div>
        <div className="rl-drawer__group">
          <h3>Plan</h3>
          <a href="#compare" onClick={onClose}>
            Business structures compared
          </a>
          <a href="#packages" onClick={onClose}>
            Registration packages
          </a>
          <a href="#builder" onClick={onClose}>
            Build my company
          </a>
        </div>
        {menus
          .filter((menu) => menu.links)
          .map((menu) => (
            <div key={menu.key} className="rl-drawer__group">
              <h3>{menu.label}</h3>
              {menu.links!.map((link) => (
                <a key={link.label} href={link.href} onClick={onClose}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}
      </div>
      <div className="rl-drawer__foot">
        <a href="#builder" className="rl-btn rl-btn--launch" onClick={onClose}>
          Start Your Company
          <ArrowRight className="rl-arrow" aria-hidden="true" />
        </a>
        <Link href={signedIn ? accountHref : "/customer/login"} className="rl-btn rl-btn--ghost">
          {signedIn ? "Dashboard" : "Log in"}
        </Link>
      </div>
    </Dialog>
  );
}

const PAGE_ENTRIES: SearchEntry[] = [
  { title: "Compare business structures", href: "#compare", meta: "On this page" },
  { title: "Build my company", href: "#builder", meta: "On this page" },
  { title: "Registration packages", href: "#packages", meta: "On this page" },
  { title: "Document checklist", href: "#documents", meta: "On this page" },
  { title: "Government fees and service fees", href: "#costs", meta: "On this page" },
  { title: "Frequently asked questions", href: "#faq", meta: "On this page" },
  { title: "Track an application", href: "/track-application", meta: "Page" },
];

function SearchDialog({ catalogue, onClose }: { catalogue: { title: string; slug: string; priceLabel: string }[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const entries = useMemo<SearchEntry[]>(
    () => [...PAGE_ENTRIES, ...catalogue.map((service) => ({ title: service.title, href: `/services/${service.slug}`, meta: service.priceLabel }))],
    [catalogue],
  );
  const q = query.trim().toLowerCase();
  const results = (q ? entries.filter((entry) => entry.title.toLowerCase().includes(q)) : entries).slice(0, 14);

  return (
    <Dialog label="Search services" className="rl-search" onClose={onClose}>
      <div className="rl-search__field">
        <Search aria-hidden="true" style={{ width: 20, height: 20, color: "var(--rl-muted)" }} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search registrations, licences, services…"
          aria-label="Search registrations, licences and services"
          aria-controls={listId}
        />
        <button type="button" className="rl-icon-btn" style={{ borderColor: "var(--rl-line)", width: 40, height: 40 }} aria-label="Close search" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <ul id={listId} className="rl-search__list" aria-live="polite">
        {results.length ? (
          results.map((entry) => (
            <li key={`${entry.href}-${entry.title}`}>
              <Link href={entry.href} onClick={onClose}>
                <span>{entry.title}</span>
                <span className="rl-fine">{entry.meta}</span>
              </Link>
            </li>
          ))
        ) : (
          <li className="rl-fine" style={{ padding: 14 }}>
            Nothing matches “{query}”. Try a shorter word, or <Link href="/services">browse all services</Link>.
          </li>
        )}
      </ul>
    </Dialog>
  );
}
