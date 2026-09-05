import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
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
import { CountUp } from "@/components/services/labour-card/count-up";
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
      <main
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
          <Documents />
          <HowItWorks />
          <RejectionReasons />
          <WhyUs />
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
          eyebrow="Shuruaat"
          title="Labour Card kya hai?"
          from="#0f5db8"
          to="#2f80ed"
        />
      </Reveal>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <Stagger className="grid gap-3 sm:grid-cols-2">
          <StaggerItem className="lg-card lg-raise p-4 sm:p-5">
            <h3 className="text-[14px] font-extrabold text-[var(--dc-ink)]">UPBOCW aur Labour Card</h3>
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">
              Uttar Pradesh Building and Other Construction Workers Welfare Board (UPBOCW) nirman kaam karne
              wale shramikon ka registration karta hai. Registration ke baad jo card milta hai use aam bhasha
              mein Labour Card ya Shram Card kehte hain. Isi registration ke aadhar par Board ki alag-alag
              welfare yojanaon mein aavedan kiya jata hai.
            </p>
          </StaggerItem>
          <StaggerItem className="lg-card lg-raise p-4 sm:p-5">
            <h3 className="text-[14px] font-extrabold text-[var(--dc-ink)]">Registration aur Renewal</h3>
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">
              Registration ek baar hota hai, par card ko active rakhna zaroori hai. Bahut si yojanayein
              &ldquo;updated registration&rdquo; maangti hain — matlab card lapse na ho. Kai yojanaon mein
              registration ke baad ek nishchit samay ki membership bhi chahiye hoti hai.
            </p>
          </StaggerItem>
        </Stagger>
        <OverviewArt className="hidden h-auto w-[240px] lg:block" />
      </div>

      {/*
        The single most useful sentence on the page, and the one a customer is
        least likely to have been told.
      */}
      <Reveal>
        <div className="mt-3 overflow-hidden rounded-2xl border-l-4 border-l-[var(--dc-flame)] bg-gradient-to-br from-white to-[#fff6ef] p-4 shadow-sm sm:p-5">
          <p className="flex items-start gap-2.5 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15.5px]">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
            Labour Card hone ka matlab ye nahi ki har scheme ka benefit apne aap mil jayega.
          </p>
          <p className="mt-1.5 pl-7 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
            Har yojana ki apni shartein hain — membership ki avadhi, 90 din kaam, bachchon ki sankhya, umar,
            aur apply karne ki samay seema. Card sirf darwaza kholta hai; andar har kamre ki apni chaabi hai.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function WhoIsItFor() {
  const jobs = [
    "Raj Mistri", "Mason", "Helper", "Carpenter", "Plumber", "Electrician",
    "Painter", "Welder", "Road worker", "Tile worker", "Nirman shramik",
  ];
  return (
    <section id="who" className="scroll-mt-24">
      <Reveal>
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#fff3e8] via-white to-[#eef5ff] p-4 shadow-sm ring-1 ring-[var(--dc-ink)]/5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <SectionHead
                icon={HardHat}
                eyebrow="Patrata"
                title="Kiske liye hai?"
                blurb="Nirman kaam se juda kaam karne wale shramik. Poori aur adhikarik list ke liye UPBOCW ki paribhasha dekhein."
                from="#c2410c"
                to="#fb923c"
              />
            </div>
            <SectionArt
              slot="trades"
              className="hidden h-auto w-[240px] rounded-2xl object-cover shadow-md sm:block"
              fallback={<TradesArt className="hidden h-auto w-[220px] sm:block" />}
            />
          </div>

          <Stagger as="ul" className="mt-4 flex flex-wrap gap-2">
            {jobs.map((job) => (
              <StaggerItem
                as="li"
                key={job}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--dc-flame)]/20 bg-white px-3 py-2 text-[12.5px] font-bold text-[var(--dc-ink)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--dc-flame)]/45"
              >
                <HardHat className="h-3.5 w-3.5 text-[var(--dc-flame)]" aria-hidden="true" />
                {job}
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
    { title: "Registration", tint: "#0f5db8", items: ["Aadhaar", "Mobile number", "Bank passbook", "Photo", "Kaam ka proof (90 din)", "Pata ka proof"] },
    { title: "Shaadi", tint: "#be123c", items: ["Labour Card", "Aadhaar (worker, beti, ladka)", "Shaadi ka proof", "Beti ki umar ka document", "Bank passbook"] },
    { title: "Padhai", tint: "#5b21b6", items: ["Marksheet", "Admission proof", "Fee receipt", "Student Aadhaar", "Bank passbook"] },
    { title: "Mrityu", tint: "#475569", items: ["Online death certificate", "Nominee / waris ka proof", "Bank passbook", "FIR / postmortem (jahan lagu ho)"] },
    { title: "Divyangta", tint: "#0e7490", items: ["CMO ka divyangta certificate", "Medical documents", "FIR (jahan lagu ho)"] },
    { title: "Bachcha / Beti", tint: "#be185d", items: ["Online birth certificate", "Institutional delivery proof", "Family register", "Aadhaar", "Bank passbook"] },
  ];
  return (
    <section id="documents" className="scroll-mt-24">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <Reveal>
          <SectionHead
            icon={FileText}
            eyebrow="Taiyari"
            title="Kaunse documents lagenge?"
            blurb="Har category ke liye alag set. Jo hai wahi laiye — kami hum bata denge."
            from="#0f5db8"
            to="#2f80ed"
          />
        </Reveal>
        <SectionArt
          slot="documents"
          className="hidden h-auto w-[240px] rounded-2xl object-cover shadow-md sm:block"
          fallback={<DocumentsArt className="hidden h-auto w-[220px] sm:block" />}
        />
      </div>

      <Stagger className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <StaggerItem key={set.title} className="lg-card lg-raise relative overflow-hidden p-4">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: set.tint }}
            />
            <h3 className="text-[13.5px] font-extrabold" style={{ color: set.tint }}>
              {set.title}
            </h3>
            <ul className="mt-2 space-y-1">
              {set.items.map((item) => (
                <li key={item} className="flex gap-1.5 text-[12.5px] font-semibold leading-snug text-[var(--dc-body)]">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0f9d58]" aria-hidden="true" />
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
    { title: "Documents dikhaiye", detail: "Jo hai wahi laiye — kami hai to hum bata denge.", tint: "#0f5db8" },
    { title: "Eligibility dekhi jayegi", detail: "Kaunsi yojana aap par lagu hoti hai, shartein ke saath.", tint: "#0f766e" },
    { title: "Application taiyar", detail: "Form bharna, scan karna, upload karna.", tint: "#5b21b6" },
    { title: "Online submission", detail: "Portal par jama.", tint: "#0e7490" },
    { title: "Vibhag ka verification", detail: "Ye vibhag karta hai — samay unka hota hai.", tint: "#c2410c" },
    { title: "Status", detail: "Hum status dekhne aur correction mein madad karte hain.", tint: "#047857" },
  ];
  return (
    <section id="process" className="scroll-mt-24">
      <Reveal>
        <SectionHead
          icon={ArrowRight}
          eyebrow="Prakriya"
          title="Kaise hota hai?"
          blurb="Chhah kadam. Paanchvan kadam vibhag ka hai — uska samay hamare haath mein nahi."
          from="#0f766e"
          to="#2dd4bf"
        />
      </Reveal>
      <Reveal>
        <ProcessArt className="mx-auto mt-4 h-auto w-full max-w-[620px]" />
      </Reveal>

      <Stagger as="ol" className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <StaggerItem as="li" key={step.title} className="lg-card lg-raise p-4">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[14px] font-extrabold text-white shadow-[0_8px_18px_-10px_rgba(16,33,61,0.7)]"
              style={{ background: `linear-gradient(145deg, ${step.tint}, ${step.tint}cc)` }}
            >
              {index + 1}
            </span>
            <h3 className="mt-2 text-[13.5px] font-extrabold text-[var(--dc-ink)]">{step.title}</h3>
            <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-[var(--dc-body)]">{step.detail}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function RejectionReasons() {
  const reasons = [
    "Card expire ya inactive",
    "Membership ki avadhi puri nahi",
    "90 din kaam ki shart puri nahi",
    "Bank detail galat ya Aadhaar se link nahi",
    "Aadhaar ke naam mein mismatch",
    "Ek hi labh dobara maanga gaya",
    "Documents adhoore",
    "Galat category mein aavedan",
    "Samay seema ke baad aavedan",
    "Bachche ki detail galat",
    "Shaadi ka proof adhoora",
    "Medical bill original nahi",
  ];
  return (
    <section id="rejections" className="scroll-mt-24">
      <Reveal>
        <div className="overflow-hidden rounded-3xl border-l-4 border-l-[var(--dc-flame)] bg-gradient-to-br from-[#fff5f0] via-white to-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <SectionHead
              icon={AlertTriangle}
              eyebrow="Savdhani"
              title="Application kyun reject hoti hai"
              blurb="Zyadatar rejection inhi wajahon se hoti hai. Apply karne se pehle ek baar mila lijiye."
              from="#b91c1c"
              to="#f87171"
            />
            <RejectionArt className="hidden h-auto w-[180px] sm:block" />
          </div>

          <Stagger as="ul" className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {reasons.map((reason) => (
              <StaggerItem
                as="li"
                key={reason}
                className="flex gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-[12.5px] font-semibold leading-snug text-[var(--dc-body)]"
              >
                <span aria-hidden="true" className="font-black text-[#dc2626]">✕</span>
                {reason}
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Us, honestly
   ───────────────────────────────────────────────────────────────────────── */

function WhyUs() {
  const items = [
    "Form bharna aur document scan karna",
    "Upload aur online submission",
    "Eligibility samajhne mein madad",
    "Status dekhna aur correction guidance",
    "Print, PVC card aur photo services",
  ];
  return (
    <section id="why-us" className="scroll-mt-24">
      <Reveal>
        <div className="lg-card overflow-hidden p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <SectionHead
              icon={Building2}
              eyebrow="Hum"
              title="DigiConnect Dukan kya karta hai"
              blurb="Hum ek private digital service centre hain. Hum application process mein assistance dete hain — approval nahi dete, aur na hi kisi sarkari vibhag ke agent hain."
              from="#0b3f80"
              to="#2f80ed"
            />
            <SectionArt
              slot="counter"
              className="hidden h-auto w-[240px] rounded-2xl object-cover shadow-md sm:block"
              fallback={<ShopArt className="hidden h-auto w-[200px] sm:block" />}
            />
          </div>

          <Stagger as="ul" className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {items.map((item) => (
              <StaggerItem
                as="li"
                key={item}
                className="flex gap-2 rounded-lg bg-[var(--dc-sky-soft)] px-2.5 py-2 text-[12.5px] font-semibold leading-snug text-[var(--dc-body)]"
              >
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
                {item}
              </StaggerItem>
            ))}
          </Stagger>
          <p className="mt-3 rounded-xl bg-[#fff1e6] px-3.5 py-2.5 text-[12px] font-bold text-[#9a3412]">
            Sarkari fees aur hamara service charge alag-alag hote hain. Charge pehle bata diya jata hai.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function Faqs() {
  return (
    <section id="faq" className="scroll-mt-24">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <Reveal>
          <SectionHead
            icon={MessageCircle}
            eyebrow="Sawal-jawab"
            title="Aksar poochhe jane wale sawal"
            from="#5b21b6"
            to="#a78bfa"
          />
        </Reveal>
        <FaqArt className="hidden h-auto w-[200px] sm:block" />
      </div>

      <Stagger className="mt-3 space-y-2">
        {LABOUR_FAQS.map((faq) => (
          <StaggerItem key={faq.question}>
            <details className="lg-card group p-4 transition hover:border-[var(--dc-blue-mid)]/30">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[13.5px] font-extrabold text-[var(--dc-ink)]">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--dc-sky-soft)] text-[15px] leading-none text-[var(--dc-blue-mid)] transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
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
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: "var(--dc-grad-blue)" }}
      >
        <div
          aria-hidden="true"
          className="lc-drift absolute -right-12 -top-12 h-56 w-56 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(242,90,0,.45) 0%, rgba(242,90,0,0) 70%)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-12 opacity-[0.14]"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0 12px, transparent 12px 24px)" }}
        />
        <div className="relative">
          <h2 className="text-[1.4rem] font-extrabold leading-tight text-white sm:text-[1.8rem]">
            Apni eligibility check karwaiye
          </h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] font-medium leading-relaxed text-white/85">
            Documents dikhaiye, hum bata denge kaunsi yojana aap par lagu ho sakti hai aur kya kami hai.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-extrabold text-[var(--dc-blue-deep)] shadow-lg transition hover:-translate-y-px"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </a>
            <a
              href={PHONE}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/12 px-5 text-[14px] font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call
            </a>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function Disclaimer({ source }: { source: "database" | "seed" }) {
  return (
    <section className="rounded-2xl border border-dashed border-[var(--dc-ink)]/20 bg-white/50 p-4 sm:p-5">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[var(--dc-body)]">Zaroori suchna</h2>
      <ul className="mt-2 space-y-1.5 text-[12px] font-medium leading-relaxed text-[var(--dc-body)]">
        <li>
          DigiConnect Dukan ek private digital service assistance provider hai. Hum Labour Card registration,
          renewal, document preparation aur online application mein assistance dete hain.
        </li>
        <li>
          Scheme ki patrata, manzoori, rakam aur bhugtan — sab sambandhit sarkari vibhag/Board ke niyam aur
          verification ke adheen hai.
        </li>
        <li>Sarkari yojanaon ke niyam aur rakam samay-samay par badal sakti hain.</li>
        <li>Application jama hone ka matlab approval ki guarantee nahi hai.</li>
        <li>Galat document dene par aavedan nirast ho sakta hai aur karyavahi bhi ho sakti hai.</li>
        <li>
          Is page par di gayi jankari margdarshan ke liye hai. Aakhri sach hamesha latest official
          notification hi hai.
        </li>
        {source === "seed" ? (
          <li className="font-bold text-[#c9430a]">
            Abhi ye jankari site ke initial dataset se dikh rahi hai. Admin panel se schemes publish hone par
            wahi dikhengi.
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
          { "@type": "ListItem", position: 1, name: "Home", item: "https://rnos.in/" },
          { "@type": "ListItem", position: 2, name: "Services", item: "https://rnos.in/services" },
          { "@type": "ListItem", position: 3, name: "Labour Card", item: "https://rnos.in/services/labour-card" },
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
        name: "UP Labour Card benefits aur welfare provisions",
        numberOfItems: schemes.length,
        itemListElement: schemes.map((scheme, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: scheme.name,
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
