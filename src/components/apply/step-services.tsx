"use client";

import { m } from "framer-motion";
import { Check, Minus, Plus, Search, Star, X } from "lucide-react";

import { PortalCard } from "@/components/customer/ui";
import { CATEGORIES, formatINR } from "@/components/apply/shared";
import { cn } from "@/lib/utils";
import type { useApplyFlow } from "@/components/apply/use-apply-flow";

type Flow = ReturnType<typeof useApplyFlow>;

/**
 * Step 1 — what the customer needs.
 *
 * A search dock and category rail over a grid of services, on the same glass
 * the marketing pages use, so arriving here from the services directory does
 * not feel like leaving the site.
 *
 * A card carries only what decides the choice: what it is, what it costs, and
 * whether it is already in the basket. No invented ratings, no "most popular"
 * — nothing here claims a fact the database does not hold.
 */
export function StepServices({ flow }: { flow: Flow }) {
  const {
    loadingServices,
    filteredServices,
    getCategoryIcon,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    favouriteServices,
    toggleFavourite,
    cart,
    cartItems,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQty,
  } = flow;

  const quantityOf = (slug: string) => cart.find((entry) => entry.slug === slug)?.quantity ?? 0;

  return (
    <div className="space-y-5">

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="lg-field flex h-13 items-center gap-2.5 px-4 py-3">
        <Search className="h-[18px] w-[18px] shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search GST, PAN, passport, licence…"
          aria-label="Search services"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--dc-ink)] outline-none placeholder:font-medium placeholder:text-[var(--dc-ink)]/40"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue-mid)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* ── Categories ─────────────────────────────────────────────────── */}
      <div
        className="-mx-[var(--mobile-page-gutter)] overflow-x-auto px-[var(--mobile-page-gutter)] pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter by category"
      >
        <div className="flex w-max gap-2">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[13px] font-extrabold transition duration-300",
                  active
                    ? "text-white shadow-[0_6px_16px_-8px_rgba(1,36,86,0.8)]"
                    : "lg-pill text-[var(--dc-ink)]/65 hover:text-[var(--dc-blue-mid)]",
                )}
                style={active ? { background: "var(--dc-grad-blue)" } : undefined}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── The catalogue ──────────────────────────────────────────────── */}
      {loadingServices ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="lg-card h-[7.5rem] animate-pulse" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <PortalCard className="text-center">
          <p className="text-[15px] font-extrabold text-[var(--dc-ink)]">Nothing matches that</p>
          <p className="mt-1 text-[13px] font-semibold text-[var(--dc-ink)]/55">
            Try a shorter word, or clear the category filter.
          </p>
        </PortalCard>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filteredServices.map((service, index) => {
            const Icon = getCategoryIcon(service.category);
            const quantity = quantityOf(service.slug);
            const inCart = quantity > 0;
            const favourite = favouriteServices.includes(service.slug);

            return (
              <m.li
                key={service.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                /* Capped so a long catalogue does not have the last card
                   waiting seconds for its turn. */
                transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.025 }}
              >
                <PortalCard
                  className={cn(
                    "h-full transition duration-300",
                    inCart && "ring-2 ring-[var(--dc-blue-bright)]/35",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ background: inCart ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)" }}
                      aria-hidden="true"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-extrabold leading-snug text-[var(--dc-ink)]">
                        {service.title}
                      </p>
                      {service.description ? (
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] font-semibold text-[var(--dc-ink)]/55">
                          {service.description}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFavourite(service.slug)}
                      aria-label={favourite ? `Remove ${service.title} from saved` : `Save ${service.title}`}
                      aria-pressed={favourite}
                      className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition"
                    >
                      <Star
                        className={cn(
                          "h-[17px] w-[17px] transition",
                          favourite
                            ? "fill-[var(--dc-amber)] text-[var(--dc-amber)]"
                            : "text-[var(--dc-ink)]/25",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between gap-3">
                    <span className="text-[16px] font-extrabold text-[var(--dc-blue-mid)]">
                      {formatINR(service.customer_fee)}
                    </span>

                    {inCart ? (
                      <div className="lg-pill flex items-center gap-1 p-1">
                        <button
                          type="button"
                          onClick={() =>
                            quantity === 1 ? removeFromCart(service.slug) : updateQty(service.slug, -1)
                          }
                          aria-label={quantity === 1 ? `Remove ${service.title}` : `One fewer ${service.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--dc-blue-mid)] transition active:scale-90"
                        >
                          {quantity === 1 ? <X className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                        </button>
                        <span className="min-w-6 text-center text-[14px] font-extrabold tabular-nums text-[var(--dc-ink)]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(service.slug, 1)}
                          aria-label={`One more ${service.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--dc-blue-mid)] transition active:scale-90"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(service.slug)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-extrabold text-white transition duration-300 hover:brightness-110 active:scale-95"
                        style={{ background: "var(--dc-grad-blue)" }}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add
                      </button>
                    )}
                  </div>
                </PortalCard>
              </m.li>
            );
          })}
        </ul>
      )}

      {/* ── What is in the basket ──────────────────────────────────────── */}
      {cartItems.length > 0 ? (
        <PortalCard>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-blue-mid)]">
            Your application
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {cartItems.map((item) => (
              <li key={item.service.slug} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate font-bold text-[var(--dc-ink)]/75">
                  {item.service.title}
                  {item.quantity > 1 ? (
                    <span className="text-[var(--dc-ink)]/40"> ×{item.quantity}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-extrabold text-[var(--dc-ink)]">
                  {formatINR(item.service.customer_fee * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex items-baseline justify-between border-t border-[var(--dc-ink)]/10 pt-2.5">
            <span className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Total</span>
            <span className="text-[19px] font-extrabold text-[var(--dc-blue-mid)]">{formatINR(cartTotal)}</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--dc-ink)]/50">
            <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            The exact amount is confirmed by our server before you pay.
          </p>
        </PortalCard>
      ) : null}
    </div>
  );
}
