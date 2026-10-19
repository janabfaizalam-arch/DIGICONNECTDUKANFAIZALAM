import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink, FileSearch, LifeBuoy, ListChecks, Lock, MessageCircle, ReceiptText, Route, Scale } from "lucide-react";

import SafeImage from "@/components/ui/safe-image";
import { BlueprintStack, ModuleArt, StructureGlyph, type BlueprintLayer } from "@/components/home-launch/art";
import { DirectoryAction } from "@/components/home-launch/directory-action";
import { AVAILABILITY_LABEL, priceText } from "@/components/home-launch/format";
import { HeroStage, LoopVideo } from "@/components/home-launch/interactive";
import { CostLedger } from "@/components/home-launch/sections-client";
import { business, legalLinks } from "@/lib/compliance/config";
import type { GuideCard } from "@/lib/homepage/launch-data";
import { LAUNCH_MODULES, STRUCTURES, moduleById, type CatalogueEntry, type ModuleId, type ResolvedModule } from "@/lib/homepage/launch-catalog";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type Resolved = Record<ModuleId, ResolvedModule>;

export function SectionHead({
  index,
  eyebrow,
  title,
  lede,
  split = true,
  id,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  split?: boolean;
  id: string;
}) {
  return (
    <header className={`rl-head${split ? " rl-head--split" : ""}`} data-reveal>
      <div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span className="rl-index">{index}</span>
          <span className="rl-eyebrow">{eyebrow}</span>
        </div>
        <h2 id={id} className="rl-h2">
          {title}
        </h2>
      </div>
      {lede ? <p className="rl-lede">{lede}</p> : null}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────────────────── */

const HERO_LAYERS: BlueprintLayer[] = [
  { key: "inc", label: "INCORPORATION", tone: "blue", lit: true },
  { key: "pan", label: "PAN · TAN", tone: "cyan", lit: true },
  { key: "gst", label: "GST · UDYAM", tone: "orange", lit: true },
  { key: "bank", label: "BANK · BOOKS", tone: "violet", lit: true },
  { key: "brand", label: "BRAND · DOMAIN", tone: "cyan", lit: true },
];

function Words({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <>
      {text.split(" ").map((word, index) => (
        <span key={`${word}-${index}`} className="rl-word" style={{ "--i": index + offset } as CSSProperties}>
          <span>{word}</span>
          {" "}
        </span>
      ))}
    </>
  );
}

export function Hero() {
  return (
    <section className="rl-stage" data-hero aria-labelledby="hero-title">
      <div className="rl-grid-bg" aria-hidden="true" />
      <div className="rl-wrap">
        <div className="rl-hero">
          <div className="rl-hero__copy">
            <span className="rl-hero__badge">
              <b>Company registration</b>
              <span className="rl-hero__badge-list">Pvt Ltd · LLP · OPC · Partnership · Proprietorship</span>            </span>
            <h1 id="hero-title" className="rl-h1">
              <Words text="Your Business" />
              <span className="rl-word" style={{ "--i": 2 } as CSSProperties}>
                <span>
                  <em>Begins</em>
                </span>
                {" "}
              </span>
              <Words text="Here." offset={3} />
            </h1>
            <p className="rl-hero__lede">
              <strong>From your first idea to your registered company.</strong> Choose your business structure, understand the costs, select the registrations
              you need, and start your company journey with RNOS.
            </p>
            <div className="rl-hero__ctas">
              <a href="#builder" className="rl-btn rl-btn--launch">
                Build My Company
                <ArrowRight className="rl-arrow" aria-hidden="true" />
              </a>
              <a href="#structures" className="rl-btn rl-btn--ghost">
                Explore Business Structures
              </a>
            </div>
            <p className="rl-hero__tertiary">
              Already know what you need?&nbsp;<a href="#packages">Compare packages</a>
            </p>
          </div>

          <HeroStage
            layers={[
              { depth: 8, node: <BlueprintStack layers={HERO_LAYERS} animate title="Illustration: a business blueprint assembling from incorporation up to brand and domain" /> },
              {
                depth: 26,
                node: (
                  <>
                    <span className="rl-scene__chip" style={{ left: "0%", top: "8%" }}>
                      <i aria-hidden="true" />
                      01 · Structure
                    </span>
                    <span className="rl-scene__chip" style={{ left: "0%", top: "76%" }}>
                      <i aria-hidden="true" />
                      02 · Documents
                    </span>
                    <span className="rl-scene__chip" style={{ right: "4%", top: "9%" }}>
                      <i aria-hidden="true" />
                      03 · Filing
                    </span>
                  </>
                ),
              },
              {
                depth: 40,
                node: (
                  <div className="rl-cert" aria-hidden="true">
                    <span className="rl-cert__seal">
                      <Scale size={14} />
                    </span>
                    <small>Illustration</small>
                    <strong>Certificate of Incorporation</strong>
                    <i />
                    <i />
                  </div>
                ),
              },
            ]}
          />
        </div>

        <ol className="rl-milestones" aria-label="From idea to operating business">
          <li>
            <b>01</b>
            <strong>Idea</strong>
            What you sell and who owns it
          </li>
          <li>
            <b>02</b>
            <strong>Structure</strong>
            The right legal form
          </li>
          <li>
            <b>03</b>
            <strong>Registered</strong>
            Filed, approved, certified
          </li>
          <li>
            <b>04</b>
            <strong>Operating</strong>
            Tax, licences, books
          </li>
        </ol>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   What we can register for you
   ───────────────────────────────────────────────────────────────────────── */

/** Photography for the registration cards. Existing site assets; nothing here is a screenshot of a real record. */
const MODULE_PHOTOS: Partial<Record<ModuleId, { src: string; alt: string; position?: string }>> = {
  gst: { src: "/images/homepage/services/gst-registration.webp", alt: "Laptop and tablet on a desk showing business charts" },
  msme: { src: "/images/homepage/services/msme-registration.webp", alt: "Laptop with a registration form beside a stack of documents" },
  dsc: { src: "/images/homepage/illustrations/trust-secure.webp", alt: "A shield, a padlock and a document folder — secure digital signing" },
  "startup-india": { src: "/images/homepage/categories/business.webp", alt: "Founders talking outside modern office buildings", position: "75% center" },
  "annual-compliance": { src: "/images/homepage/illustrations/tracking-timeline.webp", alt: "A checklist clipboard beside a timeline of milestones" },
  "current-account": { src: "/images/homepage/categories/banking-finance.webp", alt: "A bank safe beside stacks of coins", position: "80% center" },
};

const REGISTRATION_CARDS: ModuleId[] = ["gst", "msme", "dsc", "startup-india", "annual-compliance", "current-account"];

function StatusPill({ entry }: { entry: ResolvedModule }) {
  const tone = entry.availability === "checkout" ? "checkout" : entry.availability === "listed" ? "optional" : "enquiry";
  return <span className={`rl-tag rl-tag--${tone}`}>{AVAILABILITY_LABEL[entry.availability]}</span>;
}

export function ServiceDirectory({ resolved }: { resolved: Resolved }) {
  const whatsapp = buildWhatsAppUrl("Hi, I want to start a company. Which structure and registrations do I need?");
  return (
    <div className="rl-offer">
      {/* 1 — Register the company itself */}
      <div className="rl-offer__feature" data-reveal>
        <div className="rl-offer__film">
          <LoopVideo src="/videos/homepage/company-blueprint.mp4" poster="/videos/homepage/company-blueprint-poster.webp" />
          <div className="rl-offer__film-copy">
            <span className="rl-eyebrow">Step 1 · The entity</span>
            <h3>Register your company</h3>
            <p>Pick one of five structures. We prepare the documents, file with the authority and follow up until the certificate is issued.</p>
          </div>
        </div>
        <div className="rl-offer__list">
          <p className="rl-offer__list-head">
            <span>Structure</span>
            <span>Today</span>
          </p>
          <ul>
            {STRUCTURES.map((structure) => {
              const entry = resolved[structure.foundationModule];
              const price = priceText(entry);
              return (
                <li key={structure.id}>
                  <span className="rl-offer__glyph" aria-hidden="true">
                    <StructureGlyph id={structure.id} size={34} />
                  </span>
                  <span className="rl-offer__name">
                    <strong>{structure.name}</strong>
                    <span>{structure.tagline}</span>
                  </span>
                  <span className="rl-offer__status">
                    <StatusPill entry={entry} />
                    <span className="rl-price">{price ?? "We quote first"}</span>
                  </span>
                  <DirectoryAction mod={structure.foundationModule} structure={structure.id} label={entry.availability === "checkout" ? "Start" : "Ask"} />
                </li>
              );
            })}
          </ul>
          <p className="rl-fine" style={{ margin: "14px 0 0" }}>
            Not sure which fits? <a className="rl-link" href="#compare">Compare all five</a>. Government fees and stamp duty are separate and depend on capital and state.
          </p>
        </div>
      </div>

      {/* 2 — Registrations a new business usually adds */}
      <div className="rl-offer__subhead" data-reveal>
        <span className="rl-eyebrow">Step 2 · Registrations you can add</span>
        <p className="rl-fine">Buy one on its own, or add it to your company setup.</p>
      </div>
      <ul className="rl-photo-cards">
        {REGISTRATION_CARDS.map((id, index) => {
          const mod = moduleById(id)!;
          const entry = resolved[id];
          const photo = MODULE_PHOTOS[id];
          const price = priceText(entry);
          return (
            <li key={id} data-reveal style={{ "--rl-delay": `${(index % 3) * 70}ms` } as CSSProperties}>
              <article className="rl-photo-card">
                <div className="rl-photo-card__media">
                  {photo ? (
                    <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px" style={{ objectFit: "cover", objectPosition: photo.position ?? "center" }} />
                  ) : (
                    <ModuleArt group={mod.group} seed={index} />
                  )}
                  <span className="rl-photo-card__pill">
                    <StatusPill entry={entry} />
                  </span>
                  <span className="rl-photo-card__price">{price ? <strong className="rl-price">{price}</strong> : <span>Quote on request</span>}</span>
                </div>
                <div className="rl-photo-card__body">
                  <span className={`rl-tag rl-tag--${mod.nature}`} style={{ alignSelf: "flex-start" }}>
                    {mod.nature === "conditional" ? "Needed in some cases" : mod.nature === "recurring" ? "Every year" : "Optional"}
                  </span>
                  <h3>{mod.label}</h3>
                  <p>{mod.summary}</p>
                  {mod.condition ? <p className="rl-photo-card__when">{mod.condition}</p> : null}
                  <div className="rl-photo-card__foot">
                    {entry.timeline ? <span className="rl-fine">Usually {entry.timeline}</span> : <span className="rl-fine">{mod.governmentFee}</span>}
                    <span style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                      {entry.href ? (
                        <Link className="rl-btn rl-btn--ghost rl-btn--sm" href={entry.href} aria-label={`${mod.label} details`}>
                          Details
                        </Link>
                      ) : null}
                      <DirectoryAction mod={id} label="Add" />
                    </span>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* 3 — A person to talk to */}
      <aside className="rl-talk" data-reveal aria-label="Talk to our team">
        <div className="rl-talk__photo">
          <Image src="/images/homepage/hero-assistance-desktop.webp" alt="An RNOS advisor helping a customer at a desk" fill sizes="(max-width: 900px) 100vw, 560px" style={{ objectFit: "cover", objectPosition: "center 30%" }} />
        </div>
        <div className="rl-talk__copy">
          <span className="rl-eyebrow">Not sure where to start?</span>
          <h3>Tell us about your business. We&apos;ll tell you what it needs.</h3>
          <p>Two minutes on WhatsApp or a call during support hours ({business.supportHours}). No obligation.</p>
          <div className="rl-hero__ctas" style={{ marginTop: 18 }}>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rl-btn rl-btn--launch">
              <MessageCircle aria-hidden="true" />
              WhatsApp us
            </a>
            <a href={`tel:+91${business.phone}`} className="rl-btn rl-btn--ghost">
              Call +91 {business.phone}
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Cost transparency
   ───────────────────────────────────────────────────────────────────────── */

const COST_TYPES = [
  { title: "Government fees", body: "Filing fees paid to the authority — the MCA, a state department or a portal. For a company they scale with authorised capital.", who: "Paid to the government", color: "#ff8a3d" },
  { title: "Statutory charges", body: "Stamp duty on incorporation documents and agreements, set by the state where the office is registered.", who: "Paid to the state", color: "#d95a0b" },
  { title: "Professional fees", body: "Fees of third parties some services need, such as a certifying authority for a DSC or a certification body for ISO.", who: "Paid to third parties", color: "#8b6cf0" },
  { title: "RNOS service charges", body: "Our fee for preparing, reviewing, filing and following up. This is the price shown next to each service on this page.", who: "Paid to RNOS at checkout", color: "#2f80ed" },
  { title: "Optional add-ons", body: "Services you choose to add — a trademark filing or a website. Never required just because you incorporate.", who: "Only if you add them", color: "#46c4f0" },
  { title: "Taxes", body: "Tax on our charges, where applicable, appears at checkout and on the invoice — never hidden inside another figure.", who: "Shown at checkout", color: "#5b677d" },
  { title: "Recurring compliance", body: "Annual ROC filings, income tax and GST returns and renewals. Incorporation fees never cover future years.", who: "Every year", color: "#0b678c" },
];

export function CostTransparency({ resolved }: { resolved: Resolved }) {
  return (
    <>
      <ul className="rl-costs">
        {COST_TYPES.map((cost, index) => (
          <li key={cost.title} className="rl-cost" data-reveal style={{ "--rl-delay": `${(index % 4) * 60}ms` } as CSSProperties}>
            <div className="rl-cost__bar" style={{ background: cost.color }} aria-hidden="true" />
            <h3>{cost.title}</h3>
            <p>{cost.body}</p>
            <small>{cost.who}</small>
          </li>
        ))}
      </ul>
      <CostLedger resolved={resolved} />
      <p className="rl-fine" style={{ marginTop: 16, maxWidth: "85ch" }}>
        Estimates are not quotations. Where a government charge depends on capital, state or business type, we confirm it for your case before you pay it. We do
        not promise tax savings.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trust
   ───────────────────────────────────────────────────────────────────────── */

const OFFICIAL_PORTALS = [
  { label: "Ministry of Corporate Affairs", href: "https://www.mca.gov.in" },
  { label: "GST portal", href: "https://www.gst.gov.in" },
  { label: "Udyam registration", href: "https://udyamregistration.gov.in" },
  { label: "FSSAI FoSCoS", href: "https://foscos.fssai.gov.in" },
  { label: "DGFT (IEC)", href: "https://www.dgft.gov.in" },
  { label: "IP India (trademarks)", href: "https://ipindia.gov.in" },
];

export function TrustSection() {
  const whatsapp = buildWhatsAppUrl("Hi, I want to start a company. Please help me choose a structure and the registrations I need.");
  const assurances = [
    { icon: Lock, title: "Payments priced on our server", body: "Checkout goes through Razorpay. The amount is calculated and the payment verified on our server, never trusted from the browser." },
    { icon: FileSearch, title: "Documents stay inside your application", body: "You upload documents in your signed-in application, not over email or chat, and the team reviews them before filing." },
    { icon: Route, title: "Every application is trackable", body: "Follow status from your dashboard or the Track Application page." },
    { icon: ListChecks, title: "Scope before payment", body: "Each service states what it covers and what it does not. Quoted items are confirmed with you before work starts." },
  ];
  return (
    <div className="rl-trust">
      <div className="rl-idcard rl-on-night" data-reveal>
        <span className="rl-eyebrow">Who you are dealing with</span>
        <h3 style={{ margin: "14px 0 0", fontSize: "clamp(1.5rem, 1.2rem + 1vw, 2rem)", letterSpacing: "-0.025em" }}>{business.legalEntity}</h3>
        <p style={{ margin: "8px 0 0", color: "var(--rl-night-text)" }}>
          Operating {business.brand}, a private digital assistance and documentation service.
        </p>
        <dl>
          <div>
            <dt>Based in</dt>
            <dd>{business.location}</dd>
          </div>
          <div>
            <dt>Support hours</dt>
            <dd>{business.supportHours}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:+91${business.phone}`}>+91 {business.phone}</a>
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${business.email}`}>{business.email}</a>
            </dd>
          </div>
        </dl>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26 }}>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rl-btn rl-btn--ghost rl-btn--sm">
            <MessageCircle aria-hidden="true" />
            WhatsApp us
          </a>
          <a href="/track-application" className="rl-btn rl-btn--ghost rl-btn--sm">
            <Route aria-hidden="true" />
            Track an application
          </a>
          <a href="/contact" className="rl-btn rl-btn--ghost rl-btn--sm">
            <LifeBuoy aria-hidden="true" />
            Contact & grievance
          </a>
        </div>
        <p className="rl-fine" style={{ marginTop: 22 }}>
          Policies:{" "}
          {legalLinks.map((link, index) => (
            <span key={link.href}>
              <a href={link.href} style={{ color: "#c7d6f3" }}>
                {link.label}
              </a>
              {index < legalLinks.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </div>
      <div>
        <ul className="rl-assurances">
          {assurances.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="rl-assurance" data-reveal style={{ "--rl-delay": `${index * 60}ms` } as CSSProperties}>
              <Icon aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="rl-notice" data-reveal>
          <strong>Not a government website.</strong> {business.legalEntity} is a private service provider. Registrations, certificates and licences are issued
          by the relevant authority, and approval is always their decision. Official portals:{" "}
          {OFFICIAL_PORTALS.map((portal, index) => (
            <span key={portal.href}>
              <a href={portal.href} target="_blank" rel="noopener noreferrer" className="rl-link" style={{ color: "#7a3a00" }}>
                {portal.label}
                <ExternalLink size={12} aria-hidden="true" />
                <span className="rl-sr"> (opens in a new tab)</span>
              </a>
              {index < OFFICIAL_PORTALS.length - 1 ? ", " : "."}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Guides
   ───────────────────────────────────────────────────────────────────────── */

const EXPLAINERS = [
  { href: "#compare", title: "Private Limited vs LLP vs OPC", note: "Five structures, ten dimensions" },
  { href: "#costs", title: "What incorporation actually costs", note: "Government fees, stamp duty and service fees" },
  { href: "#documents", title: "Documents to keep ready", note: "A checklist for each structure" },
  { href: "#journey", title: "Your first year after incorporation", note: "What is one-time and what recurs" },
  { href: "#addons", title: "GST, Udyam, FSSAI, IEC — which apply?", note: "Conditions for each registration" },
];

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function Guides({ guides }: { guides: GuideCard[] }) {
  return (
    <div className="rl-guides">
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: guides.length > 1 ? "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" : "1fr" }}>
        {guides.length ? (
          guides.map((guide, index) => (
            <Link key={guide.slug} href={`/blog/${guide.slug}`} className="rl-article" data-reveal style={{ "--rl-delay": `${index * 60}ms` } as CSSProperties}>
              <div className="rl-article__img">
                {guide.image ? (
                  <SafeImage src={guide.image} alt="" fill sizes="(max-width: 960px) 100vw, 560px" style={{ objectFit: "cover" }} />
                ) : (
                  <ModuleArt group="tax" seed={index} />
                )}
              </div>
              <div className="rl-article__body">
                <span className="rl-fine rl-mono" style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>
                  {guide.category || "Guide"} · {guide.minutes} min read · Updated {dateFormat.format(new Date(guide.updatedAt))}
                </span>
                <h3>{guide.title}</h3>
                {guide.excerpt ? <p>{guide.excerpt}</p> : null}
              </div>
            </Link>
          ))
        ) : (
          <div className="rl-article" style={{ padding: 28, justifyContent: "center" }}>
            <BookOpen aria-hidden="true" style={{ color: "var(--rl-blue-deep)" }} />
            <h3>Explainers on this page</h3>
            <p>Our published articles appear here as they go live. Until then, every explainer on the right is part of this page.</p>
          </div>
        )}
      </div>
      <div data-reveal>
        <p className="rl-eyebrow" style={{ marginBottom: 14 }}>
          Explained on this page
        </p>
        <ul className="rl-explainers">
          {EXPLAINERS.map((item, index) => (
            <li key={item.href}>
              <a href={item.href}>
                <span className="rl-index">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{item.title}</strong>
                  <span>{item.note}</span>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
            </li>
          ))}
          <li>
            <Link href="/blog">
              <span className="rl-index">→</span>
              <span>
                <strong>All articles</strong>
                <span>The full blog</span>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Finale
   ───────────────────────────────────────────────────────────────────────── */

const FINALE_LAYERS: BlueprintLayer[] = [...HERO_LAYERS, { key: "comp", label: "COMPLIANCE", tone: "orange", lit: true }];

export function Finale({ catalogue }: { catalogue: CatalogueEntry[] }) {
  const launchSlugs = new Set(LAUNCH_MODULES.flatMap((mod) => mod.slugs));
  const others = catalogue.filter((entry) => !launchSlugs.has(entry.slug)).slice(0, 8);
  return (
    <section id="start" className="rl-stage" aria-labelledby="finale-title" style={{ marginTop: 0, paddingTop: 0 }}>
      <div className="rl-grid-bg" aria-hidden="true" />
      <div className="rl-wrap rl-section rl-on-night">
        <div className="rl-finale">
          <div data-reveal>
            <span className="rl-eyebrow">16 · Start</span>
            <h2 id="finale-title" className="rl-h2" style={{ fontSize: "clamp(2.4rem, 1.3rem + 4.4vw, 5rem)" }}>
              Your next chapter starts with a <em>company.</em>
            </h2>
            <p className="rl-lede">
              Choose your structure, customise your setup, understand the costs, and take the next step with RNOS.
            </p>
            <div className="rl-hero__ctas">
              <a href="#builder" className="rl-btn rl-btn--launch">
                Build My Company
                <ArrowRight className="rl-arrow" aria-hidden="true" />
              </a>
              <Link href="/services" className="rl-btn rl-btn--ghost">
                Explore All Services
              </Link>
            </div>
          </div>
          <div className="rl-scene" style={{ maxWidth: 560 }} aria-hidden="true">
            <BlueprintStack layers={FINALE_LAYERS} gap={46} base={450} />
          </div>
        </div>
        {others.length ? (
          <nav className="rl-also" aria-label="Other RNOS services">
            <p className="rl-fine" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <ReceiptText size={16} aria-hidden="true" /> Also at RNOS — for returning customers
            </p>
            <ul>
              {others.map((entry) => (
                <li key={entry.slug}>
                  <Link href={`/services/${entry.slug}`}>{entry.title}</Link>
                </li>
              ))}
              <li>
                <Link href="/services">All services →</Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
