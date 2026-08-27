"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  Copy,
  Gift,
  Share2,
  Sparkles,
  UserPlus,
  WalletCards,
} from "lucide-react";

import { Reveal, Stagger, StaggerItem } from "@/components/homepage/motion";
import { useToast } from "@/components/providers/toast-provider";
import {
  FIRST_SERVICE_CASHBACK_PERCENT,
  MAX_WALLET_REDEEM_PERCENT,
  REFERRER_SIGNUP_BONUS_AMOUNT,
  REPEAT_CASHBACK_PERCENT,
} from "@/lib/reward-rules";
import { cn } from "@/lib/utils";

import type { CustomerPortalData, WalletTransaction } from "@/components/customer/types";
import {
  EmptyState,
  PortalButton,
  PortalCard,
  PortalHeading,
  PortalIcon,
  StatTile,
  formatDate,
  formatINR,
} from "@/components/customer/ui";

/**
 * Wallet, referrals included.
 *
 * These were two tabs. A customer who referred a friend and then went looking
 * for the reward had to guess whether it lived under "Wallet" or under
 * "Refer & Earn" — and the answer was both, because the referral bonus is
 * credited to the same wallet balance every other credit lands in. One
 * section, with referrals as the part of it that explains where some of the
 * money comes from.
 *
 * Two figures the old wallet showed are gone:
 *
 *   • A "Pending balance" that summed transactions with `status === "pending"`.
 *     No transaction ever has that status — the type allows active, used,
 *     expired and reversed — so the figure was structurally always ₹0, printed
 *     next to real balances as though it meant something.
 *   • Referral earnings computed as `completedReferrals * 100`, with the 100
 *     typed in. The bonus is `REFERRER_SIGNUP_BONUS_AMOUNT`; if it is ever
 *     changed, a hardcoded hundred keeps quoting the old figure at customers.
 *     Where a real credited total is available it is used instead of any
 *     multiplication.
 */

function isCredit(transaction: WalletTransaction) {
  return transaction.amount > 0;
}

export function WalletSection({ walletSnapshot, stats }: CustomerPortalData) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const wallet = walletSnapshot?.wallet ?? null;
  const referral = walletSnapshot?.referralSummary ?? null;
  const transactions = walletSnapshot?.transactions ?? [];

  const balance = wallet?.balance_points ?? stats.walletBalance ?? 0;
  const earned = walletSnapshot?.cashbackEarned ?? wallet?.total_reward_earned ?? 0;
  const used = walletSnapshot?.cashbackUsed ?? wallet?.total_reward_redeemed ?? 0;
  const expiringSoon = walletSnapshot?.expiringSoonAmount ?? 0;

  const code = referral?.code || stats.code || "";
  const link = referral?.link || stats.link || "";

  /**
   * Referral earnings, from what was actually credited.
   *
   * `rewardEarned` is the sum of the credits the ledger recorded. It is only
   * when that is unavailable that we fall back to counting completed referrals
   * at the current bonus rate — and even then the rate comes from
   * `reward-rules`, not from a number typed here.
   */
  const referralEarned = useMemo(() => {
    if (referral?.rewardEarned) return referral.rewardEarned;
    if (stats.lifetimeEarning) return stats.lifetimeEarning;
    return (referral?.completed ?? 0) * REFERRER_SIGNUP_BONUS_AMOUNT;
  }, [referral, stats.lifetimeEarning]);

  const copy = useCallback(
    async (value: string, what: "code" | "link") => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(what);
        toastSuccess(what === "code" ? "Referral code copied" : "Referral link copied");
        setTimeout(() => setCopied(null), 2000);
      } catch {
        toastError("Could not copy. Please select and copy it manually.");
      }
    },
    [toastSuccess, toastError],
  );

  const share = useCallback(async () => {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "DigiConnect Dukan",
          text: "Get help with GST, ITR, passport and government filings — and we both earn.",
          url: link,
        });
        return;
      } catch {
        // Cancelled by the customer; fall through to copying.
      }
    }
    void copy(link, "link");
  }, [link, copy]);

  return (
    <div className="space-y-6">
      {/* ── Balance ──────────────────────────────────────────────────── */}
      <section aria-labelledby="wallet-heading">
        <PortalHeading
          eyebrow="Your money"
          title="Wallet"
          description={`Spend up to ${MAX_WALLET_REDEEM_PERCENT}% of any service fee from your wallet.`}
        />
        <h2 id="wallet-heading" className="sr-only">
          Wallet balance
        </h2>

        <div
          className="relative mt-5 overflow-hidden rounded-[1.5rem] p-5 text-white sm:p-6"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          <div className="dc-ambient-layer" aria-hidden="true">
            <div className="dc-jaali absolute inset-0 opacity-[0.08]" />
            <div className="dc-orb dc-orb-flame lg-drift-slow -right-[18%] -top-[60%] h-[24rem] w-[24rem] opacity-50" />
          </div>

          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-amber)]">
                <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
                Available balance
              </p>
              <p className="mt-2 text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] sm:text-[2.75rem]">
                {formatINR(balance)}
              </p>
              {expiringSoon > 0 ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-white/75">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatINR(expiringSoon)} expiring soon
                </p>
              ) : null}
            </div>

            <PortalButton href="/apply" tone="flame" className="shrink-0">
              Use it on a service
            </PortalButton>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
          <StatTile
            label="Total earned"
            value={formatINR(earned)}
            hint="Cashback and bonuses credited"
            icon={<ArrowDownLeft className="h-4 w-4" aria-hidden="true" />}
          />
          <StatTile
            label="Total used"
            value={formatINR(used)}
            hint="Applied against service fees"
            icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            tone="muted"
          />
        </div>
      </section>

      {/* ── How the wallet fills ─────────────────────────────────────── */}
      <Reveal>
        <PortalCard>
          <p className="inline-flex items-center gap-2 text-[13px] font-extrabold text-[var(--dc-ink)]">
            <Sparkles className="h-4 w-4 text-[var(--dc-flame)]" aria-hidden="true" />
            How your wallet fills
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { value: `${FIRST_SERVICE_CASHBACK_PERCENT}%`, label: "cashback on your first service" },
              { value: `${REPEAT_CASHBACK_PERCENT}%`, label: "cashback on every service after that" },
              { value: formatINR(REFERRER_SIGNUP_BONUS_AMOUNT), label: "for each friend who signs up" },
            ].map((rule) => (
              <li key={rule.label} className="rounded-xl bg-[var(--dc-blue-soft)] px-3.5 py-3">
                <p className="text-[17px] font-extrabold text-[var(--dc-blue-mid)]">{rule.value}</p>
                <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-[var(--dc-body)]">{rule.label}</p>
              </li>
            ))}
          </ul>
        </PortalCard>
      </Reveal>

      {/* ── Refer & earn ─────────────────────────────────────────────── */}
      <Reveal>
        <section id="referral" className="scroll-mt-24" aria-labelledby="referral-heading">
          <PortalHeading eyebrow="Refer & earn" title="Invite a friend" />
          <h2 id="referral-heading" className="sr-only">
            Refer and earn
          </h2>

          {code ? (
            <PortalCard className="mt-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-muted)]">
                    Your code
                  </p>
                  <p className="mt-1 font-mono text-[1.5rem] font-extrabold tracking-[0.12em] text-[var(--dc-ink)]">
                    {code}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <PortalButton onClick={() => void copy(code, "code")} tone="ghost">
                    {copied === "code" ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    {copied === "code" ? "Copied" : "Copy code"}
                  </PortalButton>
                  {link ? (
                    <PortalButton onClick={() => void share()} tone="flame">
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      Share link
                    </PortalButton>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-[var(--dc-blue-bright)]/12 pt-4">
                {[
                  { label: "Invited", value: referral?.total ?? stats.totalReferrals ?? 0 },
                  { label: "Joined", value: referral?.completed ?? 0 },
                  { label: "Earned", value: formatINR(referralEarned) },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[17px] font-extrabold text-[var(--dc-ink)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </PortalCard>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={<Gift className="h-5 w-5" aria-hidden="true" />}
                title="Your referral code is on its way"
                description="Codes are created with your account. Refresh in a moment, or contact support if it does not appear."
              />
            </div>
          )}

          {referral?.referrals?.length ? (
            <Stagger as="ul" className="mt-3 space-y-2">
              {referral.referrals.slice(0, 6).map((item) => (
                <StaggerItem as="li" key={item.id}>
                  <div className="lg-card flex items-center gap-3 p-3.5">
                    <PortalIcon tone="muted">
                      <UserPlus className="h-[17px] w-[17px]" aria-hidden="true" />
                    </PortalIcon>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-extrabold text-[var(--dc-ink)]">
                        {item.status === "completed" ? "Joined and filed" : "Signed up"}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] ring-1",
                        item.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : item.status === "rejected"
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : "bg-amber-50 text-amber-700 ring-amber-200",
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          ) : null}
        </section>
      </Reveal>

      {/* ── Ledger ───────────────────────────────────────────────────── */}
      <Reveal>
        <section aria-labelledby="ledger-heading">
          <PortalHeading eyebrow="Every credit and debit" title="Wallet history" />
          <h2 id="ledger-heading" className="sr-only">
            Wallet history
          </h2>

          {transactions.length ? (
            <ul className="mt-5 space-y-2">
              {transactions.slice(0, 20).map((transaction) => {
                const credit = isCredit(transaction);
                return (
                  <li key={transaction.id} className="lg-card flex items-center gap-3 p-3.5">
                    <PortalIcon tone={credit ? "blue" : "muted"}>
                      {credit ? (
                        <ArrowDownLeft className="h-[17px] w-[17px]" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="h-[17px] w-[17px]" aria-hidden="true" />
                      )}
                    </PortalIcon>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-extrabold text-[var(--dc-ink)]">
                        {transaction.description || (credit ? "Credit" : "Used on a service")}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                        {formatDate(transaction.created_at)}
                        {transaction.expires_at ? ` · expires ${formatDate(transaction.expires_at)}` : ""}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-[14px] font-extrabold",
                        credit ? "text-emerald-600" : "text-[var(--dc-body)]",
                      )}
                    >
                      {credit ? "+" : "−"}
                      {formatINR(Math.abs(transaction.amount))}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={<WalletCards className="h-5 w-5" aria-hidden="true" />}
                title="No wallet activity yet"
                description={`Your first service earns ${FIRST_SERVICE_CASHBACK_PERCENT}% back into this wallet.`}
                actionHref="/apply"
                actionLabel="Browse services"
              />
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}
