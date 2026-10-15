"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { LuxCard } from "@/components/credit-cards/credit-cards-page";
import s from "@/components/credit-cards/credit-cards.module.css";
import { getFeaturedCreditCards } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";

/**
 * Homepage spotlight for the /credit-cards lounge.
 *
 * A dark band in an otherwise light page, on purpose: it is the one place the
 * homepage says "premium". Three cards fan out of a stack when the band
 * scrolls into view, the mascot sits in front, and everything links to the
 * lounge rather than straight to a bank, so the visitor compares before
 * leaving the site.
 */
export function CreditCardSpotlight() {
  const reduced = useReducedMotion();
  const cards = getFeaturedCreditCards();
  if (cards.length < 3) return null;
  const fan = [cards[2], cards[1], cards[0]];

  return (
    <section aria-labelledby="credit-card-spotlight-heading" className="px-3 py-6 md:px-6 md:py-10">
      <div
        className={cn(
          s.page,
          s.goldBorder,
          "container-shell relative overflow-hidden rounded-[32px] bg-[radial-gradient(700px_circle_at_85%_20%,rgba(18,104,232,0.35),transparent_60%),radial-gradient(600px_circle_at_10%_100%,rgba(255,123,0,0.25),transparent_60%)]",
        )}
      >
        <div className={s.grid} />
        <div className="relative grid items-center gap-8 p-6 md:grid-cols-[1.1fr_1fr] md:p-12">
          <div className="relative z-10">
            <p className={cn(s.eyebrow, "flex items-center gap-2")}>
              <Sparkles className="h-3.5 w-3.5" /> New · Card Lounge
            </p>
            <h2 id="credit-card-spotlight-heading" className={cn(s.display, "mt-4 text-3xl text-white md:text-5xl")}>
              Premium <span className={s.brandInk}>Credit Cards</span>,{" "}
              <span className={cn(s.serif, s.goldInk)}>ek click mein.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--cc-muted)] md:text-base">
              {cards.length} handpicked cards — HDFC, Swiggy, Tata Neu, Axis aur bhi. Compare kariye aur seedha bank ke official
              page par apply kariye.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/credit-cards"
                className={cn(s.btnGold, "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold")}
              >
                Cards Explore Karein <ArrowRight className="h-4 w-4" />
              </Link>
              <ul className="flex flex-wrap gap-2">
                {cards.slice(0, 4).map((card) => (
                  <li key={card.slug} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80">
                    {card.name.replace(/ Credit Card.*$/, "")}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Link href="/credit-cards" aria-label="Open the credit card lounge" className="relative mx-auto block aspect-[1.25/1] w-full max-w-[460px]">
            <div className={cn(s.halo, "inset-[10%]")} />
            {fan.map((card, i) => {
              const rot = [-18, -6, 8][i];
              const pos = ["left-[0%] top-[16%]", "left-[22%] top-[4%]", "right-[0%] top-[22%]"][i];
              return (
                <m.div
                  key={card.slug}
                  className={cn("absolute w-[56%] text-[11px] sm:text-[13px]", pos)}
                  initial={reduced ? false : { opacity: 0, rotate: 0, x: 40, y: 30 }}
                  whileInView={{ opacity: 1, rotate: rot, x: 0, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className={i === 1 ? s.float : s.floatSlow}>
                    <LuxCard card={card} />
                  </div>
                </m.div>
              );
            })}
            <div className="absolute bottom-[-6%] right-[18%] h-[62%] w-[42%]">
              <Image
                src="/images/auth/brand-hero.webp"
                alt=""
                fill
                sizes="200px"
                className="object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.55)]"
              />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
