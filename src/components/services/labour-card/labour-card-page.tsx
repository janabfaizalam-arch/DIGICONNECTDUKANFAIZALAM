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
} from "lucide-react";

import { EligibilityChecker } from "@/components/services/labour-card/eligibility-checker";
import { SchemeDirectory } from "@/components/services/labour-card/scheme-directory";
import { LABOUR_FAQS } from "@/lib/labour/faqs";
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
 */

const WHATSAPP = "https://wa.me/919696969696";
const PHONE = "tel:+919696969696";

export async function LabourCardPage() {
  const { schemes, source } = await getLabourSchemes();
  const benefitCount = schemes.reduce((total, scheme) => total + scheme.benefits.length, 0);
  const categories = new Set(schemes.map((scheme) => scheme.category));

  return (
    <main className="relative bg-[#f4f7fb] pb-24">
      <Hero benefitCount={benefitCount} schemeCount={schemes.length} />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <TrustBar />
        <QuickFacts benefitCount={benefitCount} schemeCount={schemes.length} categories={categories.size} />
        <Overview />
        <WhoIsItFor />
        <SchemeDirectory schemes={schemes} />
        <EligibilityChecker schemes={schemes} />
        <Documents />
        <HowItWorks />
        <RejectionReasons />
        <WhyUs />
        <Faqs />
        <FinalCta />
        <Disclaimer source={source} />
      </div>

      <StickyBar />
      <Schema schemes={schemes} />
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────────────────── */

function Hero({ benefitCount, schemeCount }: { benefitCount: number; schemeCount: number }) {
  return (
    <header className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 100% at 8% -20%, #2f80ed 0%, #0f5db8 42%, #0b3f80 74%, #0a3168 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-10 h-64 w-64 rounded-full opacity-60"
        style={{ background: "radial-gradient(circle, rgba(242,90,0,.5) 0%, rgba(242,90,0,0) 70%)" }}
      />
      {/* A construction rhythm, drawn rather than downloaded — no image weight. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-16 opacity-[0.13]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0 14px, transparent 14px 28px)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-bold text-white/70">
            <li><Link href="/" className="hover:text-white">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/services" className="hover:text-white">Services</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-white">Labour Card</li>
          </ol>
        </nav>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white ring-1 ring-white/20">
          <HardHat className="h-3.5 w-3.5" aria-hidden="true" />
          UPBOCW · Uttar Pradesh
        </span>

        <h1 className="mt-3 max-w-3xl text-[1.9rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-white sm:text-[2.9rem]">
          UP Labour Card / UPBOCW — Registration, Renewal aur Sarkari Yojanaon ki Complete Guide
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] font-medium leading-relaxed text-white/85 sm:text-[16px]">
          Labour Card se milne wale education, shaadi, bachche, medical, divyangta, mrityu aur pension jaise
          benefits — eligibility, documents aur shartein ke saath, saaf-saaf.
        </p>

        <p className="mt-4 flex flex-wrap gap-2">
          <Stat value={`${benefitCount}+`} label="benefits" />
          <Stat value={String(schemeCount)} label="scheme / programme" />
          <Stat value="Cash · FD · Reimbursement" label="alag-alag tarah" />
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <a
            href="#eligibility"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[14px] font-extrabold text-[var(--dc-blue-deep)] shadow-lg transition hover:-translate-y-px"
          >
            Apni eligibility check karein
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="#schemes"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-white/12 px-5 text-[14px] font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
          >
            Saari yojanayein dekhein
          </a>
        </div>
      </div>
    </header>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
      <span className="text-[15px] font-extrabold text-white">{value}</span>
      <span className="text-[11.5px] font-bold text-white/75">{label}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trust — what is actually true
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Every line here describes what this shop does, not an authority it holds.
 * "Government authorised" and "official agent" are absent on purpose: they
 * would be false, and a worker who believes them will expect an approval this
 * business cannot give.
 */
function TrustBar() {
  const items = [
    { icon: FileText, label: "Document guidance" },
    { icon: Users, label: "Application assistance" },
    { icon: ShieldCheck, label: "Transparent process" },
    { icon: Building2, label: "Experienced digital service centre" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <li key={item.label} className="lg-card flex items-center gap-2.5 p-3">
          <item.icon className="h-4.5 w-4.5 shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
          <span className="text-[12px] font-bold leading-snug text-[var(--dc-ink)]">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

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
    { value: `${benefitCount}+`, label: "Benefits aur provisions" },
    { value: String(schemeCount), label: "Scheme / programme" },
    { value: String(categories), label: "Category" },
    { value: "90 din", label: "Kaam ki shart (kai yojanaon mein)" },
  ];
  return (
    <section>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {facts.map((fact) => (
          <li key={fact.label} className="lg-card p-3.5 text-center sm:p-4">
            <p className="text-[1.5rem] font-extrabold leading-none tracking-tight text-[var(--dc-ink)] sm:text-[1.9rem]">
              {fact.value}
            </p>
            <p className="mt-1.5 text-[11.5px] font-bold leading-snug text-[var(--dc-body)]">{fact.label}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[11px] font-semibold text-[var(--dc-body)]">
        Ye ginti is page par publish ki gayi schemes se hai — sarkari kul ginti ka dawa nahi.
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
      <h2 className="text-[1.35rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.75rem]">
        Labour Card kya hai?
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="lg-card p-4 sm:p-5">
          <h3 className="text-[14px] font-extrabold text-[var(--dc-ink)]">UPBOCW aur Labour Card</h3>
          <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">
            Uttar Pradesh Building and Other Construction Workers Welfare Board (UPBOCW) nirman kaam karne wale
            shramikon ka registration karta hai. Registration ke baad jo card milta hai use aam bhasha mein
            Labour Card ya Shram Card kehte hain. Isi registration ke aadhar par Board ki alag-alag welfare
            yojanaon mein aavedan kiya jata hai.
          </p>
        </div>
        <div className="lg-card p-4 sm:p-5">
          <h3 className="text-[14px] font-extrabold text-[var(--dc-ink)]">Registration aur Renewal</h3>
          <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">
            Registration ek baar hota hai, par card ko active rakhna zaroori hai. Bahut si yojanayein
            &ldquo;updated registration&rdquo; maangti hain — matlab card lapse na ho. Kai yojanaon mein
            registration ke baad ek nishchit samay ki membership bhi chahiye hoti hai.
          </p>
        </div>
      </div>

      {/*
        The single most useful sentence on the page, and the one a customer is
        least likely to have been told.
      */}
      <div className="mt-3 rounded-2xl border-l-4 border-l-[var(--dc-flame)] bg-white p-4 shadow-sm sm:p-5">
        <p className="flex items-start gap-2.5 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15.5px]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
          Labour Card hone ka matlab ye nahi ki har scheme ka benefit apne aap mil jayega.
        </p>
        <p className="mt-1.5 pl-7 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
          Har yojana ki apni shartein hain — membership ki avadhi, 90 din kaam, bachchon ki sankhya, umar, aur
          apply karne ki samay seema. Card sirf darwaza kholta hai; andar har kamre ki apni chaabi hai.
        </p>
      </div>
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
      <h2 className="text-[1.35rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.75rem]">
        Kiske liye hai?
      </h2>
      <p className="mt-1 text-[13px] font-medium text-[var(--dc-body)]">
        Nirman kaam se juda kaam karne wale shramik. Poori aur adhikarik list ke liye UPBOCW ki paribhasha
        dekhein.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {jobs.map((job) => (
          <li
            key={job}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--dc-ink)]/10 bg-white px-3 py-2 text-[12.5px] font-bold text-[var(--dc-ink)]"
          >
            <HardHat className="h-3.5 w-3.5 text-[var(--dc-blue-mid)]" aria-hidden="true" />
            {job}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Documents, process, rejections
   ───────────────────────────────────────────────────────────────────────── */

function Documents() {
  const sets = [
    { title: "Registration", items: ["Aadhaar", "Mobile number", "Bank passbook", "Photo", "Kaam ka proof (90 din)", "Pata ka proof"] },
    { title: "Shaadi", items: ["Labour Card", "Aadhaar (worker, beti, ladka)", "Shaadi ka proof", "Beti ki umar ka document", "Bank passbook"] },
    { title: "Padhai", items: ["Marksheet", "Admission proof", "Fee receipt", "Student Aadhaar", "Bank passbook"] },
    { title: "Mrityu", items: ["Online death certificate", "Nominee / waris ka proof", "Bank passbook", "FIR / postmortem (jahan lagu ho)"] },
    { title: "Divyangta", items: ["CMO ka divyangta certificate", "Medical documents", "FIR (jahan lagu ho)"] },
    { title: "Bachcha / Beti", items: ["Online birth certificate", "Institutional delivery proof", "Family register", "Aadhaar", "Bank passbook"] },
  ];
  return (
    <section id="documents" className="scroll-mt-24">
      <h2 className="text-[1.35rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.75rem]">
        Kaunse documents lagenge?
      </h2>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <div key={set.title} className="lg-card p-4">
            <h3 className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">{set.title}</h3>
            <ul className="mt-2 space-y-1">
              {set.items.map((item) => (
                <li key={item} className="flex gap-1.5 text-[12.5px] font-semibold leading-snug text-[var(--dc-body)]">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0f9d58]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Documents dikhaiye", detail: "Jo hai wahi laiye — kami hai to hum bata denge." },
    { title: "Eligibility dekhi jayegi", detail: "Kaunsi yojana aap par lagu hoti hai, shartein ke saath." },
    { title: "Application taiyar", detail: "Form bharna, scan karna, upload karna." },
    { title: "Online submission", detail: "Portal par jama." },
    { title: "Vibhag ka verification", detail: "Ye vibhag karta hai — samay unka hota hai." },
    { title: "Status", detail: "Hum status dekhne aur correction mein madad karte hain." },
  ];
  return (
    <section id="process" className="scroll-mt-24">
      <h2 className="text-[1.35rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.75rem]">
        Kaise hota hai?
      </h2>
      <ol className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="lg-card p-4">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[14px] font-extrabold text-white"
              style={{ background: "var(--dc-grad-blue)" }}
            >
              {index + 1}
            </span>
            <h3 className="mt-2 text-[13.5px] font-extrabold text-[var(--dc-ink)]">{step.title}</h3>
            <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-[var(--dc-body)]">{step.detail}</p>
          </li>
        ))}
      </ol>
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
      <div className="rounded-2xl border-l-4 border-l-[var(--dc-flame)] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-[1.2rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.5rem]">
          <AlertTriangle className="h-5 w-5 text-[var(--dc-flame)]" aria-hidden="true" />
          Application kyun reject hoti hai
        </h2>
        <p className="mt-1 text-[12.5px] font-medium text-[var(--dc-body)]">
          Zyadatar rejection inhi wajahon se hoti hai. Apply karne se pehle ek baar mila lijiye.
        </p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-[12.5px] font-semibold leading-snug text-[var(--dc-body)]">
              <span aria-hidden="true" className="text-[var(--dc-flame)]">✕</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>
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
      <div className="lg-card p-4 sm:p-6">
        <h2 className="text-[1.35rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.6rem]">
          DigiConnect Dukan kya karta hai
        </h2>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">
          Hum ek private digital service centre hain. Hum application process mein assistance dete hain —
          approval nahi dete, aur na hi kisi sarkari vibhag ke agent hain.
        </p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-[12.5px] font-semibold leading-snug text-[var(--dc-body)]">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-[var(--dc-sky-soft)] px-3.5 py-2.5 text-[12px] font-bold text-[var(--dc-ink)]">
          Sarkari fees aur hamara service charge alag-alag hote hain. Charge pehle bata diya jata hai.
        </p>
      </div>
    </section>
  );
}

function Faqs() {
  return (
    <section id="faq" className="scroll-mt-24">
      <h2 className="text-[1.35rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.75rem]">
        Aksar poochhe jane wale sawal
      </h2>
      <div className="mt-3 space-y-2">
        {LABOUR_FAQS.map((faq) => (
          <details key={faq.question} className="lg-card group p-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[13.5px] font-extrabold text-[var(--dc-ink)]">
              {faq.question}
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[var(--dc-blue-mid)] transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="overflow-hidden rounded-3xl p-6 sm:p-8" style={{ background: "var(--dc-grad-blue)" }}>
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
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-extrabold text-[var(--dc-blue-deep)]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp
        </a>
        <a
          href={PHONE}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/12 px-5 text-[14px] font-bold text-white ring-1 ring-white/25"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Call
        </a>
      </div>
    </section>
  );
}

function Disclaimer({ source }: { source: "database" | "seed" }) {
  return (
    <section className="rounded-2xl border border-dashed border-[var(--dc-ink)]/20 p-4 sm:p-5">
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

function StickyBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--dc-ink)]/10 bg-white/92 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href="#eligibility"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl text-[13.5px] font-extrabold text-white"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          Eligibility check
        </a>
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#25d366] text-white"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </a>
        <a
          href={PHONE}
          aria-label="Call"
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--dc-ink)]/12 bg-white text-[var(--dc-ink)]"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </div>
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
