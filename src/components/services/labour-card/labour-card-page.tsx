import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Droplets,
  Grid3x3,
  Hammer,
  Paintbrush,
  Ruler,
  Shovel,
  Wrench,
  Zap,
  CheckCircle2,
  FileText,
  HardHat,
  MessageCircle,
  Phone,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { MotionRoot, Reveal, Stagger, StaggerItem } from "@/components/homepage/motion";
import {
  DocumentsArt,
  FaqArt,
  HeroScene,
  OverviewArt,
  ProcessArt,
  RejectionArt,
  ShopArt,
  TradesArt,
} from "@/components/services/labour-card/art";
import { CashVsFd } from "@/components/services/labour-card/cash-vs-fd";
import { CountUp } from "@/components/services/labour-card/count-up";
import { LabourArticles } from "@/components/services/labour-card/labour-articles";
import { EligibilityChecker } from "@/components/services/labour-card/eligibility-checker";
import { SchemeDirectory } from "@/components/services/labour-card/scheme-directory";
import { LabourStickyBar } from "@/components/services/labour-card/sticky-bar";
import { LABOUR_FAQS } from "@/lib/labour/faqs";
import { photoFor, type PhotoId } from "@/lib/labour/photos";
import { getLabourSchemes } from "@/lib/labour/repository";
import { CATEGORY_LABEL } from "@/lib/labour/types";

/**
 * The Labour Card page.
 *
 * It is a guide first and a service page second, in that order deliberately:
 * somebody arriving here wants to know what they can get and whether they
 * qualify, and a page that opens by selling assistance before answering that
 * has misread the visit.
 *
 * Two rules run through every section. Nothing claims a government
 * relationship this business does not have — no "authorised", no "official
 * agent", no promise that an application will be approved. And no figure is
 * written in this file: every amount comes from the scheme records, which
 * carry their own source and verification date, so correcting a number is an
 * admin task rather than a deploy.
 *
 * The artwork is drawn, not photographed. See `art.tsx` for why: this page is
 * read on cheap phones over shop wifi, and a section that is blank for a
 * second while a stock photograph arrives has failed the reader it was drawn
 * for.
 */

const WHATSAPP = "https://wa.me/919696969696";
const PHONE = "tel:+919696969696";

export async function LabourCardPage() {
  const { schemes, source } = await getLabourSchemes();
  const benefitCount = schemes.reduce((total, scheme) => total + scheme.benefits.length, 0);
  const categories = new Set(schemes.map((scheme) => scheme.category));

  return (
    <MotionRoot>
      {/*
        `homepage-mobile-shell home-option3` is the site's own header offset —
        the header is fixed, and without this the breadcrumb rendered
        underneath it at every width. `dc-bottom-nav-clearance` does the same
        job at the other end, for the tab bar and the WhatsApp button.
      */}
      {/* `lang` on the page rather than the document: the site is English/
          Hinglish elsewhere, and a screen reader needs to switch voice for
          this one. */}
      <main
        lang="hi"
        className="lc-hi homepage-mobile-shell home-option3 dc-bottom-nav-clearance relative overflow-x-clip pb-16"
        style={{ background: "var(--lc-page)" }}
      >
        <PageBackdrop />
        <Hero benefitCount={benefitCount} schemeCount={schemes.length} />
        <SectionNav />

        <div className="relative mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:space-y-16">
          <TrustBar />
          <QuickFacts benefitCount={benefitCount} schemeCount={schemes.length} categories={categories.size} />
          <Overview />
          <WhoIsItFor />
          <Reveal>
            <SchemeDirectory schemes={schemes} />
          </Reveal>
          <Reveal>
            <EligibilityChecker schemes={schemes} />
          </Reveal>
          <CashVsFd schemes={schemes} />
          <Documents />
          <HowItWorks />
          <RejectionReasons />
          <SelfVsAssisted />
          <LabourArticles />
          <Faqs />
          <FinalCta />
          <Disclaimer source={source} />
        </div>

        <LabourStickyBar whatsapp={WHATSAPP} phone={PHONE} />
        <Schema schemes={schemes} />
      </main>
    </MotionRoot>
  );
}

/**
 * Colour under the whole page.
 *
 * Three fixed, very soft washes rather than a tint per section: the sections
 * are cards on one continuous ground, and a different background behind each
 * one turns a guide into a leaflet.
 */
function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="lc-drift absolute -left-24 top-[420px] h-[380px] w-[380px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(47,128,237,.20) 0%, rgba(47,128,237,0) 70%)" }}
      />
      <div
        className="lc-drift absolute -right-28 top-[1100px] h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(242,90,0,.16) 0%, rgba(242,90,0,0) 70%)",
          animationDelay: "-4s",
        }}
      />
      <div
        className="lc-drift absolute -left-20 top-[2000px] h-[400px] w-[400px] rounded-full opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(7,139,117,.16) 0%, rgba(7,139,117,0) 70%)",
          animationDelay: "-8s",
        }}
      />
    </div>
  );
}

/**
 * A section's title, with its own piece of artwork.
 *
 * The icon tile carries the section's colour, so a reader scrolling fast can
 * tell "documents" from "process" before either word resolves.
 */
function SectionHead({
  icon: Icon,
  eyebrow,
  title,
  blurb,
  from,
  to,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  blurb?: string;
  from: string;
  to: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_8px_20px_-10px_rgba(16,33,61,0.6)]"
        style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}
      >
        <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p
          className="text-[10.5px] font-black uppercase tracking-[0.16em]"
          style={{ color: from }}
        >
          {eyebrow}
        </p>
        <h2 className="text-[1.35rem] font-extrabold leading-tight tracking-tight text-[var(--dc-ink)] sm:text-[1.75rem]">
          {title}
        </h2>
        {blurb ? (
          <p className="mt-1 text-[13px] font-medium leading-snug text-[var(--dc-body)] sm:text-[14px]">
            {blurb}
          </p>
        ) : null}
      </div>
    </div>
  );
}


/**
 * A photograph if one has been added, the drawing otherwise.
 *
 * Both sides are declared at the call site so a section is never empty and
 * never has to be edited when a photograph arrives — see
 * `src/lib/labour/photos.ts` and the README beside the image folder.
 */
function SectionArt({
  slot,
  fallback,
  className,
  priority,
}: {
  slot: PhotoId;
  fallback: React.ReactNode;
  className?: string;
  priority?: boolean;
}) {
  const photo = photoFor(slot);
  if (!photo) return <>{fallback}</>;

  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      priority={priority}
      sizes="(max-width: 640px) 100vw, 440px"
      className={className}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The hero, in Hindi.
 *
 * Three things it deliberately does not say, all of which the design
 * reference put here:
 *
 *   * No star rating and no "50,000+ families helped". This business has no
 *     evidence for either, and a number invented to look trustworthy is the
 *     fastest way to stop being trustworthy.
 *   * No "100% accurate". Four of the fifteen scheme records are marked as
 *     needing another look, and the page says so per card. A blanket claim
 *     here would contradict its own directory.
 *   * No rupee figures. Every amount on this page comes from the scheme
 *     records so that correcting one is an admin task; a headline figure
 *     typed into this file is a figure that rots. The counts below are
 *     computed from the data that is actually published.
 */
function Hero({ benefitCount, schemeCount }: { benefitCount: number; schemeCount: number }) {
  return (
    <header className="lc-sheen relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 110% at 6% -25%, #134074 0%, #0b2545 46%, #08203c 76%, #071a31 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="lc-drift absolute -right-20 -top-16 h-72 w-72 rounded-full opacity-70"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,.45) 0%, rgba(249,115,22,0) 70%)" }}
      />
      {/* A construction rhythm, drawn rather than downloaded — no image weight. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-16 opacity-[0.12]"
        style={{
          backgroundImage: "repeating-linear-gradient(135deg, #fff 0 14px, transparent 14px 28px)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="-my-2 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-white/65">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center py-2 transition hover:text-white">
                  होम
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/services" className="inline-flex min-h-11 items-center py-2 transition hover:text-white">
                  सेवाएं
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white">लेबर कार्ड</li>
            </ol>
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-1.5 text-[11.5px] font-bold tracking-wide text-white ring-1 ring-white/20">
            <HardHat className="h-3.5 w-3.5" aria-hidden="true" />
            UPBOCW · उत्तर प्रदेश
          </span>

          {/* No negative tracking: it pulls Devanagari matras into the
              consonant beside them. Latin can take it, this script cannot. */}
          <h1 className="mt-4 max-w-3xl text-[2rem] font-extrabold text-white sm:text-[2.9rem] lg:text-[3.2rem]">
            UP Labour Card से मिलने वाले सरकारी लाभ,{" "}
            <span className="text-[#ffb066]">अब आसानी से समझें</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] font-medium text-white/85 sm:text-[17px]">
            शिक्षा, कन्या विवाह, मातृत्व, चिकित्सा, दिव्यांगता, मृत्यु और पेंशन — हर योजना की पात्रता,
            ज़रूरी दस्तावेज़ और शर्तें, साफ़-साफ़। हर रकम के साथ यह भी लिखा है कि वह किस रूप में मिलती है।
          </p>

          <ul className="mt-5 flex flex-wrap gap-2">
            <Stat value={`${benefitCount}+`} label="लाभ व प्रावधान" />
            <Stat value={String(schemeCount)} label="योजना / कार्यक्रम" />
            <Stat value="नकद · FD · प्रतिपूर्ति" label="अलग-अलग तरह" />
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#eligibility"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(249,115,22,0.9)] transition hover:-translate-y-px active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--lc-saffron), var(--lc-saffron-deep))" }}
            >
              पात्रता चेक करें
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="#schemes"
              className="inline-flex h-[52px] items-center justify-center rounded-xl bg-white/10 px-6 text-[15px] font-bold text-white ring-1 ring-white/25 transition hover:bg-white/18"
            >
              सभी योजनाएं देखें
            </a>
          </div>

          {/*
            The one trust line this business can actually stand behind: not how
            many people it has helped, but where its numbers come from.
          */}
          <p className="mt-5 flex items-start gap-2 text-[12.5px] font-semibold text-white/70">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4ade80]" aria-hidden="true" />
            हर योजना के साथ उसका स्रोत और आख़िरी बार जाँचने की तारीख़ दी गई है — जो अभी सत्यापित नहीं है,
            उस पर भी साफ़ लिखा है।
          </p>
        </div>

        {/* The illustration. Hidden below `sm` — on a 360px phone it would push
            the buttons off the first screen, and the heading is the thing that
            has to be visible there. */}
        <SectionArt
          slot="hero"
          priority
          className="hidden h-auto w-full max-w-[460px] justify-self-center rounded-3xl object-cover shadow-2xl ring-1 ring-white/20 sm:block"
          fallback={
            <HeroScene className="hidden h-auto w-full max-w-[460px] justify-self-center drop-shadow-2xl sm:block" />
          }
        />
      </div>
    </header>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <li className="inline-flex items-baseline gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 ring-1 ring-white/15 backdrop-blur-sm">
      <span className="lc-figure text-[15.5px] font-extrabold text-white">{value}</span>
      <span className="text-[12px] font-semibold text-white/75">{label}</span>
    </li>
  );
}

/**
 * Jump links to the parts of a very long page.
 *
 * Deliberately not sticky. The scheme directory already pins its own search
 * and filter row directly under the site header; a second sticky strip would
 * either fight it for the same band or stack into a third of the screen on a
 * phone. This sits once, under the hero, where somebody deciding what to read
 * will look.
 */
function SectionNav() {
  const links = [
    { href: "#schemes", label: "योजनाएं" },
    { href: "#eligibility", label: "पात्रता जांच" },
    { href: "#documents", label: "आवश्यक दस्तावेज़" },
    { href: "#process", label: "प्रक्रिया" },
    { href: "#rejections", label: "रिजेक्शन के कारण" },
    { href: "#faq", label: "सवाल-जवाब" },
  ];
  return (
    <nav
      aria-label="इस पृष्ठ के भाग"
      className="relative border-b bg-white/92 backdrop-blur-xl"
      style={{ borderColor: "var(--lc-border)" }}
    >
      <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-[13px] font-bold transition hover:-translate-y-px"
              style={{
                borderColor: "var(--lc-border)",
                color: "var(--lc-navy)",
                background: "var(--lc-card)",
              }}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trust — what is actually true
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Every line here describes what this shop does, not an authority it holds.
 * "सरकार द्वारा अधिकृत" and "official agent" are absent on purpose: they
 * would be false, and a worker who believes them will expect an approval this
 * business cannot give.
 */
function TrustBar() {
  const items = [
    { icon: FileText, label: "दस्तावेज़ मार्गदर्शन", tint: "var(--lc-navy-light)" },
    { icon: Users, label: "आवेदन में सहायता", tint: "var(--lc-saffron-deep)" },
    { icon: ShieldCheck, label: "पारदर्शी प्रक्रिया", tint: "var(--lc-emerald)" },
    { icon: Building2, label: "अनुभवी डिजिटल सेवा केंद्र", tint: "var(--lc-navy)" },
  ];
  return (
    <Stagger as="ul" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <StaggerItem as="li" key={item.label} className="lc-card lc-lift flex items-center gap-3 p-3.5">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: item.tint }}
          >
            <item.icon className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
          </span>
          <span className="text-[12.5px] font-bold leading-snug" style={{ color: "var(--lc-navy)" }}>
            {item.label}
          </span>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/**
 * Four counts, each one computed from the schemes that are actually published.
 *
 * The fourth is the ninety-day work condition, which is not a count of
 * anything on this page — it is the single rule that decides most
 * applications, and putting it beside the totals is the point.
 */
function QuickFacts({
  benefitCount,
  schemeCount,
  categories,
}: {
  benefitCount: number;
  schemeCount: number;
  categories: number;
}) {
  const facts = [
    { value: benefitCount, suffix: "+", label: "लाभ व कल्याणकारी प्रावधान", tint: "var(--lc-navy-light)" },
    { value: schemeCount, suffix: "", label: "योजना / कार्यक्रम", tint: "var(--lc-saffron-deep)" },
    { value: categories, suffix: "", label: "श्रेणियाँ", tint: "var(--lc-fd)" },
    { value: 90, suffix: " दिन", label: "कार्य प्रमाण की शर्त (कई योजनाओं में)", tint: "var(--lc-emerald)" },
  ];
  return (
    <section>
      <Stagger as="ul" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((fact) => (
          <StaggerItem
            as="li"
            key={fact.label}
            className="lc-card lc-lift relative overflow-hidden p-4 text-center"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: fact.tint }}
            />
            <p
              className="lc-figure text-[1.7rem] font-extrabold leading-none sm:text-[2.1rem]"
              style={{ color: fact.tint }}
            >
              <CountUp value={fact.value} suffix={fact.suffix} />
            </p>
            <p className="mt-2 text-[12px] font-semibold leading-snug" style={{ color: "var(--lc-muted)" }}>
              {fact.label}
            </p>
          </StaggerItem>
        ))}
      </Stagger>
      <p className="mt-3 text-center text-[11.5px] font-semibold" style={{ color: "var(--lc-muted)" }}>
        यह गिनती इस पृष्ठ पर प्रकाशित योजनाओं से है — सरकारी कुल गिनती का दावा नहीं।
      </p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Overview
   ───────────────────────────────────────────────────────────────────────── */

function Overview() {
  return (
    <section id="overview" className="scroll-mt-24">
      <Reveal>
        <SectionHead
          icon={BadgeCheck}
          eyebrow="शुरुआत"
          title="लेबर कार्ड क्या है?"
          from="var(--lc-navy)"
          to="var(--lc-navy-light)"
        />
      </Reveal>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <Stagger className="grid gap-4 sm:grid-cols-2">
          <StaggerItem className="lc-card lc-lift p-5">
            <h3 className="text-[15px] font-bold" style={{ color: "var(--lc-navy)" }}>
              UPBOCW और लेबर कार्ड
            </h3>
            <p className="mt-2 text-[13.5px] font-medium" style={{ color: "var(--lc-muted)" }}>
              उत्तर प्रदेश भवन एवं अन्य सन्निर्माण कर्मकार कल्याण बोर्ड (UPBOCW) निर्माण कार्य करने वाले
              श्रमिकों का पंजीकरण करता है। पंजीकरण के बाद जो कार्ड मिलता है उसे आम भाषा में लेबर कार्ड या
              श्रम कार्ड कहते हैं। इसी पंजीकरण के आधार पर बोर्ड की अलग-अलग कल्याणकारी योजनाओं में आवेदन
              किया जाता है।
            </p>
          </StaggerItem>
          <StaggerItem className="lc-card lc-lift p-5">
            <h3 className="text-[15px] font-bold" style={{ color: "var(--lc-navy)" }}>
              पंजीकरण और नवीनीकरण
            </h3>
            <p className="mt-2 text-[13.5px] font-medium" style={{ color: "var(--lc-muted)" }}>
              पंजीकरण एक बार होता है, पर कार्ड को सक्रिय रखना ज़रूरी है। बहुत सी योजनाएं
              &ldquo;अपडेटेड पंजीकरण&rdquo; माँगती हैं — मतलब कार्ड लैप्स न हो। कई योजनाओं में पंजीकरण के
              बाद एक निश्चित समय की सदस्यता भी चाहिए होती है।
            </p>
          </StaggerItem>
        </Stagger>
        <OverviewArt className="hidden h-auto w-[250px] lg:block" />
      </div>

      {/*
        The single most useful sentence on the page, and the one a customer is
        least likely to have been told.
      */}
      <Reveal>
        <div
          className="mt-4 overflow-hidden rounded-2xl border-l-4 bg-gradient-to-br from-white to-[#fff7ed] p-5"
          style={{ borderLeftColor: "var(--lc-saffron)", boxShadow: "var(--lc-shadow-1)" }}
        >
          <p
            className="flex items-start gap-3 text-[15px] font-bold sm:text-[16.5px]"
            style={{ color: "var(--lc-navy)" }}
          >
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: "var(--lc-saffron-deep)" }}
              aria-hidden="true"
            />
            लेबर कार्ड होने का मतलब यह नहीं कि हर योजना का लाभ अपने आप मिल जाएगा।
          </p>
          <p className="mt-2 pl-8 text-[13px] font-medium" style={{ color: "var(--lc-muted)" }}>
            हर योजना की अपनी शर्तें हैं — सदस्यता की अवधि, 90 दिन काम, बच्चों की संख्या, उम्र, और आवेदन
            करने की समय सीमा। कार्ड सिर्फ़ दरवाज़ा खोलता है; अंदर हर कमरे की अपनी चाबी है।
          </p>
        </div>
      </Reveal>
    </section>
  );
}

/**
 * The trades the board covers.
 *
 * Eight cards rather than a row of word-chips: a reader looking for their own
 * work wants to recognise it, and "बढ़ई" with "लकड़ी व शटरिंग काम" under it is
 * recognisable in a way that a bare label is not. The list is not the board's
 * full definition and says so.
 */
function WhoIsItFor() {
  const trades = [
    { name: "राजमिस्त्री", detail: "दीवार, चिनाई व प्लास्टर", icon: Hammer },
    { name: "बढ़ई (Carpenter)", detail: "लकड़ी व शटरिंग काम", icon: Ruler },
    { name: "इलेक्ट्रीशियन", detail: "घरेलू वायरिंग व फिटिंग", icon: Zap },
    { name: "प्लंबर व पाइप फिटर", detail: "पानी व सीवरेज कारीगर", icon: Droplets },
    { name: "पेंटर व पुट्टी", detail: "रंग-रोगन व पीओपी", icon: Paintbrush },
    { name: "हेल्पर व बेलदार", detail: "सीमेंट व मसाला मज़दूर", icon: Shovel },
    { name: "वेल्डर व लोहारी", detail: "ग्रिल, गेट व सरिया बाँधना", icon: Wrench },
    { name: "टाइल व मार्बल", detail: "पत्थर व फ़र्श कारीगर", icon: Grid3x3 },
  ];
  return (
    <section id="who" className="scroll-mt-24">
      <Reveal>
        <div
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#fff7ed] via-white to-[#eef4fb] p-5 sm:p-7"
          style={{ boxShadow: "var(--lc-shadow-1)" }}
        >
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <SectionHead
              icon={HardHat}
              eyebrow="पात्रता"
              title="श्रम कार्ड किन कामगारों के लिए मान्य है?"
              blurb="भवन निर्माण व असंगठित निर्माण क्षेत्र के कई प्रकार के कामगार इस बोर्ड के अंतर्गत आते हैं। नीचे कुछ प्रमुख काम दिए हैं — पूरी और अधिकारिक सूची के लिए UPBOCW की परिभाषा देखें।"
              from="var(--lc-saffron-deep)"
              to="var(--lc-saffron)"
            />
            <SectionArt
              slot="trades"
              className="hidden h-auto w-[250px] rounded-2xl object-cover sm:block"
              fallback={<TradesArt className="hidden h-auto w-[230px] sm:block" />}
            />
          </div>

          <Stagger as="ul" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {trades.map((trade) => (
              <StaggerItem as="li" key={trade.name} className="lc-card lc-lift p-4">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--lc-saffron-soft)" }}
                >
                  <trade.icon
                    className="h-5 w-5"
                    style={{ color: "var(--lc-saffron-deep)" }}
                    strokeWidth={2.1}
                  />
                </span>
                <p className="mt-2.5 text-[13.5px] font-bold" style={{ color: "var(--lc-navy)" }}>
                  {trade.name}
                </p>
                <p className="mt-0.5 text-[11.5px] font-semibold" style={{ color: "var(--lc-muted)" }}>
                  {trade.detail}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Documents, process, rejections
   ───────────────────────────────────────────────────────────────────────── */

function Documents() {
  const sets = [
    { title: "पंजीकरण", tint: "var(--lc-navy-light)", items: ["आधार कार्ड", "मोबाइल नंबर", "बैंक पासबुक", "फ़ोटो", "काम का प्रमाण (90 दिन)", "पते का प्रमाण"] },
    { title: "विवाह", tint: "#be123c", items: ["लेबर कार्ड", "आधार (श्रमिक, बेटी, लड़का)", "शादी का प्रमाण", "बेटी की उम्र का दस्तावेज़", "बैंक पासबुक"] },
    { title: "पढ़ाई", tint: "var(--lc-fd)", items: ["अंकतालिका (मार्कशीट)", "प्रवेश का प्रमाण", "फ़ीस रसीद", "छात्र का आधार", "बैंक पासबुक"] },
    { title: "मृत्यु", tint: "#475569", items: ["ऑनलाइन मृत्यु प्रमाण पत्र", "नॉमिनी / वारिस का प्रमाण", "बैंक पासबुक", "FIR / पोस्टमॉर्टम (जहाँ लागू हो)"] },
    { title: "दिव्यांगता", tint: "var(--lc-reimburse)", items: ["CMO का दिव्यांगता प्रमाण पत्र", "मेडिकल दस्तावेज़", "FIR (जहाँ लागू हो)"] },
    { title: "बच्चा / बेटी", tint: "#be185d", items: ["ऑनलाइन जन्म प्रमाण पत्र", "संस्थागत प्रसव का प्रमाण", "परिवार रजिस्टर", "आधार", "बैंक पासबुक"] },
  ];
  return (
    <section id="documents" className="scroll-mt-24">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <Reveal>
          <SectionHead
            icon={FileText}
            eyebrow="तैयारी"
            title="आवेदन के लिए आवश्यक दस्तावेज़"
            blurb="हर श्रेणी के लिए अलग सेट। जो है वही लाइए — कमी हम बता देंगे।"
            from="var(--lc-navy)"
            to="var(--lc-navy-light)"
          />
        </Reveal>
        <SectionArt
          slot="documents"
          className="hidden h-auto w-[240px] rounded-2xl object-cover sm:block"
          fallback={<DocumentsArt className="hidden h-auto w-[220px] sm:block" />}
        />
      </div>

      <Stagger className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <StaggerItem key={set.title} className="lc-card lc-lift relative overflow-hidden p-4.5">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: set.tint }}
            />
            <h3 className="pl-2 text-[14px] font-bold" style={{ color: set.tint }}>
              {set.title}
            </h3>
            <ul className="mt-2.5 space-y-1.5 pl-2">
              {set.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-[12.5px] font-semibold leading-snug"
                  style={{ color: "var(--lc-muted)" }}
                >
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: "var(--lc-emerald)" }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: "पात्रता जांच", detail: "कौन सी योजना आप पर लागू होती है, शर्तों के साथ।", tint: "var(--lc-navy-light)" },
    { title: "दस्तावेज़ तैयारी", detail: "जो है वही लाइए — कमी है तो हम बता देंगे।", tint: "#0f766e" },
    { title: "फ़ॉर्म व ऑनलाइन आवेदन", detail: "फ़ॉर्म भरना, स्कैन करना, अपलोड करना।", tint: "var(--lc-fd)" },
    { title: "ऑनलाइन जमा", detail: "पोर्टल पर आवेदन जमा।", tint: "var(--lc-reimburse)" },
    { title: "विभागीय सत्यापन", detail: "यह विभाग करता है — समय उनका होता है।", tint: "var(--lc-saffron-deep)" },
    { title: "खाते में लाभ", detail: "नियमानुसार। हम स्टेटस देखने और सुधार में मदद करते हैं।", tint: "var(--lc-emerald)" },
  ];
  return (
    <section id="process" className="scroll-mt-24">
      <Reveal>
        <SectionHead
          icon={ArrowRight}
          eyebrow="प्रक्रिया"
          title="आवेदन से लेकर खाते में लाभ आने तक"
          blurb="छह कदम। पाँचवाँ कदम विभाग का है — उसका समय हमारे हाथ में नहीं।"
          from="#0f766e"
          to="#2dd4bf"
        />
      </Reveal>
      <Reveal>
        <ProcessArt className="mx-auto mt-5 h-auto w-full max-w-[620px]" />
      </Reveal>

      <Stagger as="ol" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <StaggerItem as="li" key={step.title} className="lc-card lc-lift p-4.5">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-extrabold text-white"
              style={{ background: step.tint, boxShadow: "var(--lc-shadow-1)" }}
            >
              {index + 1}
            </span>
            <h3 className="mt-2.5 text-[14px] font-bold" style={{ color: "var(--lc-navy)" }}>
              {step.title}
            </h3>
            <p className="mt-1 text-[12.5px] font-medium leading-snug" style={{ color: "var(--lc-muted)" }}>
              {step.detail}
            </p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/**
 * Why applications fail.
 *
 * The design reference pulled four reasons out into a warning band and left
 * the rest. Both are kept: the four that account for most refusals get the
 * band, and the full list stays underneath, because a reader whose problem is
 * the twelfth one is exactly the reader this section is for.
 */
function RejectionReasons() {
  const top = [
    {
      title: "आधार और बैंक पासबुक में नाम अलग",
      detail: "स्पेलिंग का छोटा-सा फ़र्क़ भी DBT रोक देता है। दोनों जगह नाम बिलकुल एक जैसा होना चाहिए।",
    },
    {
      title: "कार्ड एक्सपायर या निष्क्रिय",
      detail: "वार्षिक नवीनीकरण शुल्क न भरने पर कार्ड लैप्स हो जाता है, और पोर्टल फ़ॉर्म ही स्वीकार नहीं करता।",
    },
    {
      title: "90 दिन कार्य का प्रमाण नहीं",
      detail: "पिछले 12 महीनों में 90 दिन निर्माण कार्य का नियोजक या ग्राम प्रधान का प्रमाण पत्र ज़रूरी है।",
    },
    {
      title: "समय सीमा के बाद आवेदन",
      detail: "कई योजनाओं में घटना (विवाह, जन्म, मृत्यु) के एक वर्ष के भीतर आवेदन करना होता है।",
    },
  ];
  const rest = [
    "सदस्यता की अवधि पूरी नहीं",
    "बैंक खाता आधार से लिंक नहीं",
    "एक ही लाभ दोबारा माँगा गया",
    "दस्तावेज़ अधूरे",
    "ग़लत श्रेणी में आवेदन",
    "बच्चे की जानकारी ग़लत",
    "शादी का प्रमाण अधूरा",
    "मेडिकल बिल मूल (original) नहीं",
  ];
  return (
    <section id="rejections" className="scroll-mt-24">
      <Reveal>
        <div
          className="overflow-hidden rounded-3xl border-l-4 bg-gradient-to-br from-[#fff5f0] via-white to-white p-5 sm:p-7"
          style={{ borderLeftColor: "var(--lc-saffron)", boxShadow: "var(--lc-shadow-1)" }}
        >
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <SectionHead
              icon={AlertTriangle}
              eyebrow="सावधानी"
              title="आवेदन रिजेक्ट क्यों होते हैं"
              blurb="ज़्यादातर रिजेक्शन इन्हीं वजहों से होते हैं। आवेदन करने से पहले एक बार मिला लीजिए।"
              from="#b91c1c"
              to="#f87171"
            />
            <RejectionArt className="hidden h-auto w-[190px] sm:block" />
          </div>

          <Stagger className="mt-5 grid gap-3 sm:grid-cols-2">
            {top.map((reason, index) => (
              <StaggerItem key={reason.title} className="rounded-2xl border border-[#fecaca] bg-white p-4">
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-extrabold text-white"
                  style={{ background: "#dc2626" }}
                >
                  {index + 1}
                </span>
                <h3 className="mt-2.5 text-[13.5px] font-bold" style={{ color: "var(--lc-navy)" }}>
                  {reason.title}
                </h3>
                <p className="mt-1 text-[12.5px] font-medium leading-snug" style={{ color: "var(--lc-muted)" }}>
                  {reason.detail}
                </p>
              </StaggerItem>
            ))}
          </Stagger>

          <p className="mt-5 text-[12px] font-black uppercase tracking-[0.14em]" style={{ color: "var(--lc-muted)" }}>
            बाक़ी सामान्य कारण
          </p>
          <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
            {rest.map((reason) => (
              <li
                key={reason}
                className="flex gap-2 rounded-lg bg-white/70 px-3 py-2 text-[12.5px] font-semibold leading-snug"
                style={{ color: "var(--lc-muted)" }}
              >
                <span aria-hidden="true" className="font-black text-[#dc2626]">✕</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Us, honestly
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Self-apply against assisted, with nothing invented in our column.
 *
 * Every row is something this shop actually does. There is no row claiming a
 * faster departmental decision, a higher approval rate or any influence over
 * the outcome, because none of that is true — the department decides, on its
 * own timetable, either way.
 */
function SelfVsAssisted() {
  const rows = [
    { task: "पात्रता समझना", self: "ख़ुद पढ़कर तय करना होता है", us: "शर्तें मिलाकर बताते हैं" },
    { task: "दस्तावेज़ जाँच", self: "कमी आवेदन के बाद पता चलती है", us: "जमा करने से पहले जाँच लेते हैं" },
    { task: "स्कैन व अपलोड", self: "फ़ाइल साइज़ व फ़ॉर्मेट की दिक़्क़त", us: "काउंटर पर स्कैन व कंप्रेस" },
    { task: "फ़ॉर्म भरना", self: "पोर्टल हिंदी-अंग्रेज़ी मिला-जुला", us: "साथ बैठकर भरते हैं" },
    { task: "स्टेटस देखना", self: "बार-बार ख़ुद लॉगिन करना", us: "देखकर बता देते हैं" },
    { task: "आपत्ति (objection) पर सुधार", self: "क्या ठीक करना है, समझना पड़ता है", us: "सुधार में मदद" },
    { task: "PVC कार्ड व फ़ोटो", self: "अलग दुकान ढूँढनी पड़ती है", us: "यहीं हो जाता है" },
  ];
  return (
    <section id="services" className="scroll-mt-24">
      <Reveal>
        <div className="lc-card overflow-hidden p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <SectionHead
              icon={Building2}
              eyebrow="हम"
              title="ख़ुद आवेदन करना बनाम DigiConnect Dukan सहायता"
              blurb="हम एक निजी डिजिटल सेवा केंद्र हैं। हम आवेदन प्रक्रिया में सहायता देते हैं — मंज़ूरी नहीं दिलाते, और न ही किसी सरकारी विभाग के एजेंट हैं।"
              from="var(--lc-navy)"
              to="var(--lc-navy-light)"
            />
            <SectionArt
              slot="counter"
              className="hidden h-auto w-[240px] rounded-2xl object-cover sm:block"
              fallback={<ShopArt className="hidden h-auto w-[210px] sm:block" />}
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="sr-only">ख़ुद आवेदन करने और सहायता लेने की तुलना</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="rounded-tl-xl px-4 py-3 text-[12px] font-black uppercase tracking-wide"
                    style={{ background: "#f1f5f9", color: "var(--lc-muted)" }}
                  >
                    काम
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[12px] font-black uppercase tracking-wide"
                    style={{ background: "#f1f5f9", color: "var(--lc-muted)" }}
                  >
                    ख़ुद करने पर
                  </th>
                  <th
                    scope="col"
                    className="rounded-tr-xl px-4 py-3 text-[12px] font-black uppercase tracking-wide text-white"
                    style={{ background: "var(--lc-navy)" }}
                  >
                    हमारे साथ
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.task} style={{ background: index % 2 ? "#f8fafc" : "#ffffff" }}>
                    <th
                      scope="row"
                      className="px-4 py-3 text-[13px] font-bold"
                      style={{ color: "var(--lc-navy)" }}
                    >
                      {row.task}
                    </th>
                    <td className="px-4 py-3 text-[12.5px] font-medium" style={{ color: "var(--lc-muted)" }}>
                      {row.self}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] font-semibold" style={{ color: "var(--lc-emerald)" }}>
                      <span className="flex gap-1.5">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {row.us}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p
            className="mt-4 rounded-xl px-4 py-3 text-[12.5px] font-bold"
            style={{ background: "var(--lc-saffron-soft)", color: "#9a3412" }}
          >
            सरकारी फ़ीस और हमारा सेवा शुल्क अलग-अलग होते हैं। शुल्क पहले बता दिया जाता है। किसी भी योजना
            में मंज़ूरी की गारंटी नहीं — मंज़ूरी विभाग के नियमों और सत्यापन के अधीन है।
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function Faqs() {
  return (
    <section id="faq" className="scroll-mt-24">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <Reveal>
          <SectionHead
            icon={MessageCircle}
            eyebrow="सवाल-जवाब"
            title="अक्सर पूछे जाने वाले सवाल"
            from="var(--lc-fd)"
            to="#a78bfa"
          />
        </Reveal>
        <FaqArt className="hidden h-auto w-[210px] sm:block" />
      </div>

      <Stagger className="mt-4 space-y-2.5">
        {LABOUR_FAQS.map((faq) => (
          <StaggerItem key={faq.question}>
            <details className="lc-card group p-4.5">
              <summary
                className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 text-[14px] font-bold"
                style={{ color: "var(--lc-navy)" }}
              >
                {faq.question}
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[16px] leading-none transition group-open:rotate-45"
                  style={{ background: "#eef4fb", color: "var(--lc-navy-light)" }}
                >
                  +
                </span>
              </summary>
              <p className="mt-2.5 text-[13px] font-medium" style={{ color: "var(--lc-muted)" }}>
                {faq.answer}
              </p>
            </details>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function FinalCta() {
  return (
    <Reveal>
      <section
        className="relative overflow-hidden rounded-3xl p-6 sm:p-9"
        style={{
          background: "linear-gradient(135deg, var(--lc-navy) 0%, var(--lc-navy-light) 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="lc-drift absolute -right-16 -top-16 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,.42) 0%, rgba(249,115,22,0) 70%)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-12 opacity-[0.14]"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0 12px, transparent 12px 24px)" }}
        />
        <div className="relative">
          <h2 className="text-[1.5rem] font-extrabold text-white sm:text-[2rem]">
            अपने लेबर कार्ड के फ़ायदे जानें और आज ही सहायता पाएं
          </h2>
          <p className="mt-2.5 max-w-xl text-[14px] font-medium text-white/85">
            दस्तावेज़ दिखाइए, हम बता देंगे कौन सी योजना आप पर लागू हो सकती है और क्या कमी है।
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[52px] items-center gap-2 rounded-xl px-6 text-[15px] font-bold text-white transition hover:-translate-y-px"
              style={{ background: "var(--lc-emerald)" }}
            >
              <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" />
              व्हाट्सएप पर सहायता पाएं
            </a>
            <a
              href={PHONE}
              className="inline-flex h-[52px] items-center gap-2 rounded-xl bg-white/12 px-6 text-[15px] font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
            >
              <Phone className="h-4.5 w-4.5" aria-hidden="true" />
              फ़ोन पर बात करें
            </a>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function Disclaimer({ source }: { source: "database" | "seed" }) {
  return (
    <section
      className="rounded-2xl border border-dashed p-5"
      style={{ borderColor: "#cbd5e1", background: "rgba(255,255,255,0.55)" }}
    >
      <h2 className="text-[12.5px] font-black uppercase tracking-wide" style={{ color: "var(--lc-muted)" }}>
        ज़रूरी सूचना
      </h2>
      <ul className="mt-2.5 space-y-2 text-[12.5px] font-medium" style={{ color: "var(--lc-muted)" }}>
        <li>
          DigiConnect Dukan एक निजी डिजिटल सेवा (private digital service) सहायता प्रदाता है। हम लेबर कार्ड पंजीकरण,
          नवीनीकरण, दस्तावेज़ तैयारी और ऑनलाइन आवेदन में सहायता देते हैं — हम मंज़ूरी नहीं दिलाते और
          न ही किसी सरकारी विभाग के एजेंट हैं।
        </li>
        <li>
          योजना की पात्रता, मंज़ूरी, रकम और भुगतान — सब संबंधित सरकारी विभाग/बोर्ड के नियमों और
          सत्यापन के अधीन है।
        </li>
        <li>सरकारी योजनाओं के नियम और रकम समय-समय पर बदल सकती हैं।</li>
        <li>आवेदन जमा होने का मतलब मंज़ूरी की गारंटी नहीं है।</li>
        <li>ग़लत दस्तावेज़ देने पर आवेदन निरस्त हो सकता है और कार्यवाही भी हो सकती है।</li>
        <li>
          इस पृष्ठ पर दी गई जानकारी मार्गदर्शन के लिए है। आख़िरी सच हमेशा नवीनतम आधिकारिक अधिसूचना
          ही है।
        </li>
        {source === "seed" ? (
          <li className="font-bold" style={{ color: "#c2410c" }}>
            अभी यह जानकारी साइट के प्रारंभिक डेटासेट से दिख रही है। एडमिन पैनल से योजनाएं प्रकाशित
            होने पर वही दिखेंगी।
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Structured data
   ───────────────────────────────────────────────────────────────────────── */

/**
 * FAQ and breadcrumb schema only.
 *
 * Deliberately no Service schema carrying prices or a government affiliation,
 * and no aggregateRating — a rating this site cannot evidence is exactly the
 * kind of claim search engines penalise and customers are misled by.
 */
function Schema({ schemes }: { schemes: Awaited<ReturnType<typeof getLabourSchemes>>["schemes"] }) {
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "होम", item: "https://rnos.in/" },
          { "@type": "ListItem", position: 2, name: "सेवाएं", item: "https://rnos.in/services" },
          { "@type": "ListItem", position: 3, name: "लेबर कार्ड", item: "https://rnos.in/services/labour-card" },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: LABOUR_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
      {
        "@type": "ItemList",
        name: "UP लेबर कार्ड लाभ व कल्याणकारी प्रावधान",
        numberOfItems: schemes.length,
        itemListElement: schemes.map((scheme, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: scheme.nameHi || scheme.name,
          description: scheme.summary,
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Built from our own data, not from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export { CATEGORY_LABEL };
