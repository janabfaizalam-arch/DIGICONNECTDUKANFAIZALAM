"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CreditCard,
  FileCheck2,
  MessageCircle,
  MousePointerClick,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";

import { MotionRoot, Reveal, Stagger, StaggerItem } from "@/components/homepage/motion";
import type { CreditCardOffer } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";
import s from "./credit-cards.module.css";

const MASCOT = "/images/auth/brand-hero.webp";
const REEL = "/videos/digiconnect-intro-reel.mp4";
const REEL_POSTER = "/videos/digiconnect-intro-reel-poster.webp";
const EASE = [0.22, 1, 0.36, 1] as const;

/** Card face palettes. Brand-inspired colours, not the banks' own artwork. */
const FACES: Record<CreditCardOffer["theme"], { bg: string; accent: string; label: string }> = {
  hdfc: { bg: "linear-gradient(135deg,#0a2a6b 0%,#0f4fb5 45%,#041330 100%)", accent: "#7fb2ff", label: "Classic" },
  swiggy: { bg: "linear-gradient(135deg,#ff8a1f 0%,#fc5e03 45%,#5c1d02 100%)", accent: "#ffe0bf", label: "Dining" },
  tata: { bg: "linear-gradient(135deg,#2a0f4f 0%,#6d28d9 50%,#12062a 100%)", accent: "#e3c8ff", label: "Neu Plus" },
  rupay: { bg: "linear-gradient(135deg,#043d8a 0%,#1d7af0 50%,#04224d 100%)", accent: "#a8e1ff", label: "RuPay" },
  biz: { bg: "linear-gradient(135deg,#0d1424 0%,#23344f 50%,#05070c 100%)", accent: "#e9c47c", label: "Business" },
  pixel: { bg: "linear-gradient(135deg,#111114 0%,#2c2c33 50%,#000 100%)", accent: "#c7f9ff", label: "Digital" },
  axis: { bg: "linear-gradient(135deg,#4a0a2c 0%,#97144d 50%,#1c0411 100%)", accent: "#ffc4dc", label: "Lifestyle" },
  yes: { bg: "linear-gradient(135deg,#071a3d 0%,#0f4c81 50%,#02111f 100%)", accent: "#a5f3fc", label: "Classic" },
  indusind: { bg: "linear-gradient(135deg,#2a1a0a 0%,#a16207 50%,#120a04 100%)", accent: "#fde68a", label: "Premium" },
};

export type CreditCardsLinks = { whatsappHref: string };

/* ── Custom cursor ──────────────────────────────────────────────────────── */

/**
 * A gold dot that tracks the pointer exactly and a ring that trails it.
 * Anything with `data-cursor="Label"` swells the ring and shows the label.
 * Runs only for a fine pointer with motion allowed; touch keeps the native one.
 */
function useCustomCursor(rootRef: React.RefObject<HTMLDivElement | null>) {
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    const target = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };
    let frame = 0;

    const onMove = (e: globalThis.PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      const hit = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]");
      setLabel(hit ? hit.dataset.cursor || "" : null);
    };
    const tick = () => {
      ring.x += (target.x - ring.x) * 0.16;
      ring.y += (target.y - ring.y) * 0.16;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      frame = requestAnimationFrame(tick);
    };
    const root = rootRef.current;
    root?.addEventListener("pointermove", onMove);
    frame = requestAnimationFrame(tick);
    return () => {
      root?.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [reduced, rootRef]);

  const cursor = enabled ? (
    <>
      <div ref={ringRef} className={cn(s.cursorRing, label !== null && s.cursorRingActive)} aria-hidden>
        {label}
      </div>
      <div ref={dotRef} className={s.cursorDot} aria-hidden />
    </>
  ) : null;

  return { cursor, enabled };
}

/* ── The card face ──────────────────────────────────────────────────────── */

export function LuxCard({ card, className, style }: { card: CreditCardOffer; className?: string; style?: CSSProperties }) {
  const face = FACES[card.theme];
  return (
    <div className={cn(s.card, className)} style={{ background: face.bg, ...style }}>
      <div className={s.sheen} />
      <div className={s.glare} />
      <div
        className="absolute -right-10 -top-16 h-44 w-44 rounded-full opacity-30 blur-2xl"
        style={{ background: face.accent }}
      />
      <div className="relative z-[3] flex h-full flex-col justify-between p-[7%]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.62em] font-extrabold uppercase tracking-[0.22em] text-white/75">{card.bankName}</p>
            <p className="mt-1 font-heading text-[1.05em] font-bold leading-tight">{card.name.replace(/ Credit Card.*$/, "")}</p>
          </div>
          <Wifi className="h-[1.3em] w-[1.3em] rotate-90 text-white/70" />
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(s.chip, "relative h-[2.1em] w-[2.9em] rounded-md")}>
            <div className="absolute inset-y-0 left-1/2 w-px bg-amber-900/30" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-amber-900/30" />
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[0.55em] font-extrabold uppercase tracking-[0.16em]"
            style={{ color: face.accent, border: `1px solid ${face.accent}55` }}
          >
            {face.label}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[0.72em] tracking-[0.2em] text-white/85">••••  ••••  ••••  2026</p>
            <p className="mt-1 text-[0.5em] font-semibold uppercase tracking-[0.22em] text-white/55">via DigiConnect · RNoS</p>
          </div>
          <p className="text-[1.15em] font-black italic tracking-tight">{card.cardNetwork}</p>
        </div>
      </div>
    </div>
  );
}

/* ── 3D tilt wrapper ───────────────────────────────────────────────────── */

function Tilt({ children, className, max = 14 }: { children: ReactNode; className?: string; max?: number }) {
  const reduced = useReducedMotion();
  const rx = useSpring(0, { stiffness: 180, damping: 18 });
  const ry = useSpring(0, { stiffness: 180, damping: 18 });
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set(-(py - 0.5) * max * 2);
    const el = ref.current;
    if (el) {
      el.style.setProperty("--gx", `${px * 100}%`);
      el.style.setProperty("--gy", `${py * 100}%`);
      el.style.setProperty("--go", "1");
    }
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    ref.current?.style.setProperty("--go", "0");
  };

  return (
    <div className={className} style={{ perspective: 1100 }} onPointerMove={onMove} onPointerLeave={onLeave}>
      <m.div ref={ref} style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}>
        {children}
      </m.div>
    </div>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function HeroStage({ cards, mx, my }: { cards: CreditCardOffer[]; mx: MotionValue<number>; my: MotionValue<number> }) {
  const back = { x: useTransform(mx, [-1, 1], [-26, 26]), y: useTransform(my, [-1, 1], [-18, 18]) };
  const mid = { x: useTransform(mx, [-1, 1], [-14, 14]), y: useTransform(my, [-1, 1], [-10, 10]) };
  const front = { x: useTransform(mx, [-1, 1], [10, -10]), y: useTransform(my, [-1, 1], [8, -8]) };
  const fan = [cards[2], cards[1], cards[0]];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <div className={cn(s.halo, "inset-[12%]")} />
      <div className={cn(s.orbit, "inset-[4%]")} />
      <div className={cn(s.orbit, "inset-[18%] [animation-direction:reverse] [animation-duration:28s]")} />

      {/* Three cards fanned behind the mascot, each on its own parallax depth. */}
      {fan.map((card, i) => {
        const layer = [back, mid, front][i];
        const rot = [-24, -8, 9][i];
        const pos = ["left-[2%] top-[10%]", "left-[30%] top-[2%]", "right-[0%] top-[16%]"][i];
        return (
          <m.div
            key={card.slug}
            className={cn("absolute w-[52%] text-[13px] sm:text-[15px]", pos)}
            style={{ x: layer.x, y: layer.y }}
            initial={{ opacity: 0, y: 60, rotate: rot - 20 }}
            animate={{ opacity: 1, y: 0, rotate: rot }}
            transition={{ duration: 1.1, delay: 0.25 + i * 0.15, ease: EASE }}
          >
            <div className={i === 1 ? s.float : s.floatSlow}>
              <LuxCard card={card} />
            </div>
          </m.div>
        );
      })}

      <m.div
        className="absolute inset-x-[14%] bottom-0 top-[22%]"
        style={{ x: front.x, y: front.y }}
        initial={{ opacity: 0, y: 80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.55, ease: EASE }}
      >
        <Image
          src={MASCOT}
          alt="The DigiConnect mascot giving a thumbs up from behind a laptop"
          fill
          priority
          sizes="(min-width: 1024px) 420px, 70vw"
          className="object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.55)]"
        />
      </m.div>

      {[
        { text: "Rewards", cls: "left-[-2%] bottom-[24%]", d: 1.0 },
        { text: "Cashback", cls: "right-[-2%] bottom-[34%]", d: 1.15 },
        { text: "Direct bank link", cls: "left-[24%] bottom-[2%]", d: 1.3 },
      ].map((chip) => (
        <m.span
          key={chip.text}
          className={cn(s.glass, "absolute flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white shadow-lg", chip.cls)}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: chip.d, ease: EASE }}
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--cc-gold)]" /> {chip.text}
        </m.span>
      ))}
    </div>
  );
}

function Hero({ cards }: { cards: CreditCardOffer[] }) {
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 18 });
  const smy = useSpring(my, { stiffness: 60, damping: 18 });

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    mx.set(px * 2 - 1);
    my.set(py * 2 - 1);
    ref.current?.style.setProperty("--mx", `${px * 100}%`);
    ref.current?.style.setProperty("--my", `${py * 100}%`);
  };

  return (
    <section ref={ref} className={cn(s.hero, "overflow-hidden")} onPointerMove={onMove}>
      <div className={s.grid} />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
        <div className="relative z-10">
          <m.p className={s.eyebrow} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            RNoS · DigiConnect Card Lounge
          </m.p>
          <m.h1
            className={cn(s.display, "mt-5 text-[2.6rem] sm:text-6xl lg:text-[4.4rem]")}
            /* Slides only, never fades: the headline is readable before hydration. */
            initial={{ y: 28 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          >
            Premium <span className={s.brandInk}>Credit Cards</span>,{" "}
            <span className={cn(s.serif, s.goldInk, "font-normal")}>ek click mein.</span>
          </m.h1>
          <m.p
            className="mt-6 max-w-xl text-base leading-relaxed text-[var(--cc-muted)] md:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          >
            HDFC, Swiggy, Tata Neu, Axis aur bhi — apne lifestyle ke hisaab se card chuniye aur seedha bank ke official
            application par apply kariye. Koi lambi line nahi, koi paperwork ka jhanjhat nahi.
          </m.p>
          <m.div
            className="mt-9 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
          >
            <a href="#cards" data-cursor="Explore" className={cn(s.btnGold, "inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold")}>
              Cards Explore Karein <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#film" data-cursor="Play" className={cn(s.btnGhost, "inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white")}>
              <PlayCircle className="h-4 w-4 text-[var(--cc-gold)]" /> Video Dekhein
            </a>
          </m.div>
          <m.dl
            className="mt-12 grid max-w-lg grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            {[
              [String(cards.length), "Curated cards"],
              ["100%", "Online apply"],
              ["Direct", "Bank links"],
            ].map(([v, l]) => (
              <div key={l} className="border-l border-white/15 pl-4">
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--cc-muted)]">{l}</dt>
                <dd className={cn(s.display, s.goldInk, "mt-1 text-3xl")}>{v}</dd>
              </div>
            ))}
          </m.dl>
        </div>
        <HeroStage cards={cards} mx={smx} my={smy} />
      </div>
    </section>
  );
}

/* ── Marquee ────────────────────────────────────────────────────────────── */

function Marquee({ cards }: { cards: CreditCardOffer[] }) {
  const items = [...cards, ...cards];
  return (
    <div className={cn(s.marquee, "border-y border-white/10 bg-white/[0.02] py-5")} aria-hidden>
      <div className={s.marqueeTrack}>
        {items.map((card, i) => (
          <span key={i} className="flex items-center gap-5 px-6 text-sm font-bold uppercase tracking-[0.2em] text-white/55">
            {card.name}
            <span className="text-[var(--cc-gold)]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── The gallery ────────────────────────────────────────────────────────── */

function CardTile({ card }: { card: CreditCardOffer }) {
  return (
    <article className={cn(s.glass, s.tile, "group flex h-full flex-col rounded-[28px] p-5 md:p-6")}>
      <Tilt className="text-[13px] sm:text-[15px]">
        <LuxCard card={card} />
      </Tilt>
      <div className="mt-6 flex flex-1 flex-col">
        <p className={s.eyebrow}>{card.bankName}</p>
        <h3 className="mt-2 font-heading text-xl font-bold text-white">{card.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cc-muted)]">{card.overview}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {card.shortBenefits.map((b) => (
            <li key={b} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85">
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-3 pt-6">
          <a
            href={card.applyUrl}
            target="_blank"
            rel="noopener noreferrer sponsored nofollow"
            data-cursor="Apply"
            className={cn(s.btnGold, "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold")}
          >
            Apply Now <ArrowUpRight className="h-4 w-4" />
          </a>
          <Link
            href={`/credit-cards/${card.slug}`}
            data-cursor="View"
            className={cn(s.btnGhost, "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold text-white")}
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}

function Gallery({ cards }: { cards: CreditCardOffer[] }) {
  return (
    <section id="cards" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-20 md:px-8 md:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className={s.eyebrow}>The collection</p>
        <h2 className={cn(s.display, "mt-4 text-4xl md:text-6xl")}>
          Aapka agla card, <span className={cn(s.serif, s.goldInk)}>yahin hai.</span>
        </h2>
        <p className="mt-5 text-[var(--cc-muted)]">
          Har card par mouse le jaiye — ghuma ke dekhiye. Pasand aaye to <b className="text-white">Apply Now</b> dabaiye, aap
          seedha bank ke secure page par pahunch jayenge.
        </p>
      </Reveal>
      <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:[&>*:last-child:nth-child(3n+1)]:col-start-2">
        {cards.map((card) => (
          <StaggerItem key={card.slug} className="h-full">
            <CardTile card={card} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ── Film: the reel in a phone, with images around it ───────────────────── */

function Film() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const phoneRot = useTransform(scrollYProgress, [0, 1], [-6, 6]);
  const leftY = useTransform(scrollYProgress, [0, 1], [140, -60]);
  const rightY = useTransform(scrollYProgress, [0, 1], [-40, 120]);

  return (
    <section id="film" ref={ref} className="relative scroll-mt-24 overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(800px_circle_at_70%_50%,rgba(18,104,232,0.22),transparent_60%),radial-gradient(600px_circle_at_20%_80%,rgba(255,123,0,0.14),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 md:px-8 lg:grid-cols-2">
        <Reveal>
          <p className={s.eyebrow}>Watch the story</p>
          <h2 className={cn(s.display, "mt-4 text-4xl md:text-5xl")}>
            DigiConnect, <span className={cn(s.serif, s.goldInk)}>34 second mein.</span>
          </h2>
          <p className="mt-5 max-w-lg text-[var(--cc-muted)]">
            GST se passport tak, insurance se credit card tak — aapki har digital seva ek hi jagah. Video play kariye aur
            dekhiye hum kaise kaam karte hain.
          </p>
          <ul className="mt-8 grid gap-4">
            {[
              [ShieldCheck, "Bank ka official, secure application page"],
              [FileCheck2, "Documents aur eligibility ki poori jaankari"],
              [MessageCircle, "Koi sawaal ho to WhatsApp par seedhi madad"],
            ].map(([Icon, text]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={text as string} className="flex items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--cc-blue)] to-[var(--cc-orange)]">
                    <I className="h-5 w-5 text-white" />
                  </span>
                  <span className="font-semibold text-white/90">{text as string}</span>
                </li>
              );
            })}
          </ul>
        </Reveal>

        <div className="relative mx-auto h-[640px] w-full max-w-[520px]">
          <m.div style={{ y: leftY }} className={cn(s.goldBorder, "absolute left-0 top-10 hidden w-44 overflow-hidden rounded-3xl sm:block")}>
            <Image src="/images/homepage/illustrations/rewards-wallet.webp" alt="A wallet overflowing with reward points" width={352} height={352} className="h-auto w-full" />
          </m.div>
          <m.div style={{ y: rightY }} className={cn(s.goldBorder, "absolute bottom-6 right-0 hidden w-48 overflow-hidden rounded-3xl sm:block")}>
            <Image src="/images/homepage/illustrations/trust-secure.webp" alt="A shield protecting a secure payment" width={384} height={384} className="h-auto w-full" />
          </m.div>
          <m.div style={{ y: phoneY, rotate: phoneRot }} className={cn(s.phone, "absolute left-1/2 top-1/2 w-[270px] -translate-x-1/2 -translate-y-1/2")}>
            <video
              src={REEL}
              poster={REEL_POSTER}
              className="block aspect-[9/16] w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
              aria-label="DigiConnect Dukan intro reel"
              data-cursor="Watch"
            />
          </m.div>
        </div>
      </div>
    </section>
  );
}

/* ── How it works, with a scroll-drawn progress line ────────────────────── */

const STEPS = [
  { icon: CreditCard, title: "Card chuniye", text: "Upar ki collection mein se apne kharche ke hisaab se card select kariye." },
  { icon: MousePointerClick, title: "Apply Now dabaiye", text: "Aap seedha bank ke official, secure application page par pahunchenge." },
  { icon: FileCheck2, title: "KYC poori kariye", text: "PAN, Aadhaar aur income details bhariye — bank verification karega." },
  { icon: BadgeCheck, title: "Card aapke ghar", text: "Approval ke baad bank card issue karke aapke address par bhejta hai." },
];

function Steps() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  return (
    <section className="mx-auto max-w-5xl px-4 py-20 md:px-8 md:py-28">
      <Reveal className="text-center">
        <p className={s.eyebrow}>Kaise kaam karta hai</p>
        <h2 className={cn(s.display, "mt-4 text-4xl md:text-5xl")}>
          Chaar kadam, <span className={cn(s.serif, s.goldInk)}>aur card aapka.</span>
        </h2>
      </Reveal>
      <div ref={ref} className="relative mt-16 pl-14 md:pl-0">
        <div className="absolute bottom-0 left-5 top-0 w-px bg-white/10 md:left-1/2" />
        <m.div
          className="absolute bottom-0 left-5 top-0 w-px origin-top bg-gradient-to-b from-[var(--cc-gold)] via-[var(--cc-orange)] to-[var(--cc-blue)] md:left-1/2"
          style={{ scaleY }}
        />
        <ol className="grid gap-12">
          {STEPS.map((step, i) => (
            <li key={step.title} className={cn("relative md:w-1/2", i % 2 ? "md:ml-auto md:pl-14" : "md:pr-14 md:text-right")}>
              <span
                className={cn(
                  "absolute top-1 grid h-10 w-10 place-items-center rounded-full border border-[var(--cc-gold)]/60 bg-[var(--cc-night)] text-sm font-black text-[var(--cc-gold)]",
                  "-left-14 md:left-auto",
                  i % 2 ? "md:-left-5" : "md:-right-5",
                )}
              >
                {i + 1}
              </span>
              <Reveal delay={0.05}>
                <div className={cn(s.glass, "rounded-3xl p-6")}>
                  <step.icon className={cn("h-7 w-7 text-[var(--cc-gold)]", i % 2 ? "" : "md:ml-auto")} />
                  <h3 className="mt-4 font-heading text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--cc-muted)]">{step.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Finale ─────────────────────────────────────────────────────────────── */

function Finale({ cards, links }: { cards: CreditCardOffer[]; links: CreditCardsLinks }) {
  return (
    <section className="px-4 pb-20 md:px-8 md:pb-28">
      <Reveal>
        <div className={cn(s.goldBorder, "relative mx-auto grid max-w-6xl items-center gap-8 overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#0b2a66,#071a3d_45%,#3a1a05)] p-8 md:grid-cols-[1.3fr_1fr] md:p-14")}>
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--cc-orange)]/30 blur-3xl" />
          <div className="relative">
            <p className={s.eyebrow}>Ready?</p>
            <h2 className={cn(s.display, "mt-4 text-4xl md:text-5xl")}>
              Aaj hi apna <span className={cn(s.serif, s.goldInk)}>premium card</span> apply kariye.
            </h2>
            <p className="mt-4 max-w-md text-[var(--cc-muted)]">Confuse hain kaunsa card lein? WhatsApp par puchiye — hum sahi card chunne mein madad karenge.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={cards[0]?.applyUrl}
                target="_blank"
                rel="noopener noreferrer sponsored nofollow"
                data-cursor="Apply"
                className={cn(s.btnGold, "inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold")}
              >
                {cards[0]?.name} <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href={links.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="Chat"
                className={cn(s.btnGhost, "inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white")}
              >
                <MessageCircle className="h-4 w-4 text-[#25d366]" /> WhatsApp par puchiye
              </a>
            </div>
          </div>
          <div className={cn(s.float, "relative mx-auto aspect-square w-full max-w-[300px]")}>
            <Image src={MASCOT} alt="" fill sizes="300px" className="object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
      </Reveal>
      <p className="mx-auto mt-10 max-w-4xl text-center text-xs leading-relaxed text-white/45">
        Credit card approval bank ki eligibility, verification, credit score aur bank terms par nirbhar hai. DigiConnect Dukan
        (RNoS India Pvt Ltd) sirf jaankari aur bank ke application link tak pahunch deta hai; approval, fees, rewards aur limits
        poori tarah issuing bank tay karta hai. Card designs is page ke liye banaye gaye illustrations hain, bank ke asli card
        nahi.
      </p>
    </section>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export function CreditCardsPage({ cards, links }: { cards: CreditCardOffer[]; links: CreditCardsLinks }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { cursor, enabled } = useCustomCursor(rootRef);
  const { scrollYProgress } = useScroll();

  return (
    <MotionRoot>
      <div ref={rootRef} className={cn(s.page, enabled && s.cursorOn)}>
        <m.div
          className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-[var(--cc-blue)] via-[var(--cc-gold)] to-[var(--cc-orange)]"
          style={{ scaleX: scrollYProgress }}
          aria-hidden
        />
        {cursor}
        <Hero cards={cards} />
        <Marquee cards={cards} />
        <Gallery cards={cards} />
        <Film />
        <Steps />
        <Finale cards={cards} links={links} />
      </div>
    </MotionRoot>
  );
}
