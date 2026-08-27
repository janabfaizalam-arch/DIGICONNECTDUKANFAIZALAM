"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  Gift,
  Sparkles,
  Upload,
  WalletCards,
} from "lucide-react";

import { Reveal, Stagger, StaggerItem } from "@/components/homepage/motion";
import { StatusBadge } from "@/components/portal/status-badge";
import { collectTasks, countApplications } from "@/lib/customer/application-summary";
import type { CustomerSection } from "@/lib/customer/sections";
import { cn } from "@/lib/utils";

import type { CustomerPortalData } from "@/components/customer/types";
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
 * Home.
 *
 * The old home screen opened with a greeting, an "Apply for New Service"
 * button, four counters and a list of recent applications. A customer signing
 * in wants one thing answered before anything else — *is anything waiting on
 * me?* — and four counters do not answer it: they say how many applications
 * are in each bucket, and leave the customer to work out which of those
 * buckets is their problem.
 *
 * So the first thing on this screen is the short list of things the customer
 * can act on, and nothing else competes with it. When that list is empty the
 * screen says so plainly, because "nothing needs you" is a genuinely good
 * answer and a customer should be able to close the tab knowing it.
 */

const TASK_ICON = {
  pay_now: CreditCard,
  upload_documents: Upload,
  view_respond: ClipboardList,
} as const;

export function HomeSection({
  applications,
  walletSnapshot,
  stats,
  profileStatus,
  documents = [],
  onNavigate,
}: CustomerPortalData & { onNavigate: (section: CustomerSection) => void }) {
  const counts = useMemo(() => countApplications(applications), [applications]);
  const tasks = useMemo(() => collectTasks(applications), [applications]);

  const recent = useMemo(
    () =>
      [...applications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4),
    [applications],
  );

  const walletBalance = walletSnapshot?.wallet?.balance_points ?? stats.walletBalance ?? 0;
  const completion = profileStatus?.completion;
  const profileIncomplete = Boolean(completion && completion.percent < 100);

  return (
    <div className="space-y-6">
      {/* ── What needs you ───────────────────────────────────────────── */}
      <section aria-labelledby="tasks-heading">
        <PortalHeading
          eyebrow="Your next step"
          title={tasks.length ? "These need you" : "Nothing needs you right now"}
          description={
            tasks.length
              ? "Finish these and your filings keep moving."
              : "Every application is with our team. We will alert you the moment something needs your attention."
          }
          /* No "Apply" button here. On desktop the sidebar carries one and on
             a phone the app's bottom navigation has it as its centre control,
             so a third copy on this screen only pushed the list of things that
             actually need the customer further down. */
        />
        <h2 id="tasks-heading" className="sr-only">
          Actions waiting on you
        </h2>

        {tasks.length ? (
          <Stagger as="ul" className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {tasks.map((task) => {
              const Icon = TASK_ICON[task.action.key as keyof typeof TASK_ICON] ?? ClipboardList;
              const urgent = task.action.key === "pay_now";
              return (
                <StaggerItem as="li" key={`${task.applicationId}-${task.action.key}`}>
                  <Link
                    href={task.action.href}
                    className={cn(
                      "lg-card lg-raise lg-sheen flex h-full items-center gap-3 p-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)] sm:p-4",
                      urgent && "ring-1 ring-[var(--dc-flame)]/35",
                    )}
                  >
                    <PortalIcon tone={urgent ? "flame" : "blue"}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </PortalIcon>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-extrabold text-[var(--dc-ink)]">
                        {task.serviceName}
                      </span>
                      <span className="mt-0.5 block text-[12px] font-bold text-[var(--dc-body)]">
                        {task.action.label}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--dc-muted)]" aria-hidden="true" />
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <PortalCard className="mt-5 flex items-center gap-3">
            <PortalIcon tone="blue">
              <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </PortalIcon>
            <p className="text-[13.5px] font-bold text-[var(--dc-ink)]">
              {counts.active > 0
                ? `${counts.active} application${counts.active === 1 ? "" : "s"} in progress. We will be in touch.`
                : "You have no open applications."}
            </p>
          </PortalCard>
        )}
      </section>

      {/* ── At a glance ──────────────────────────────────────────────── */}
      <Reveal>
        <section aria-labelledby="glance-heading">
          <h2 id="glance-heading" className="sr-only">
            Your account at a glance
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <StatTile
              label="In progress"
              value={counts.active}
              hint="Applications still moving"
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              onClick={() => onNavigate("applications")}
            />
            <StatTile
              label="Completed"
              value={counts.completed}
              hint="Filed and delivered"
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              onClick={() => onNavigate("applications")}
            />
            <StatTile
              label="Wallet"
              value={formatINR(walletBalance)}
              hint="Usable on your next fee"
              icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
              tone="flame"
              onClick={() => onNavigate("wallet")}
            />
            <StatTile
              label="Documents"
              value={documents.length}
              hint="Files on your applications"
              icon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
              onClick={() => onNavigate("documents")}
            />
          </div>
        </section>
      </Reveal>

      {/* ── Finish your profile ──────────────────────────────────────── */}
      {profileIncomplete && completion ? (
        <Reveal>
          <PortalCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <PortalIcon tone="flame">
                <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
              </PortalIcon>
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-[var(--dc-ink)]">Finish your profile</p>
                <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                  {completion.completed} of {completion.total} details saved. A complete profile means we do not have
                  to ask for the same information on every application.
                </p>
                <div className="mt-2.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--dc-blue-soft)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${completion.percent}%`, background: "var(--dc-grad-flame)" }}
                  />
                </div>
              </div>
            </div>
            <PortalButton onClick={() => onNavigate("account")} tone="ghost" className="shrink-0">
              Complete it
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PortalButton>
          </PortalCard>
        </Reveal>
      ) : null}

      {/* ── Recent applications ──────────────────────────────────────── */}
      <Reveal>
        <section aria-labelledby="recent-heading">
          <PortalHeading
            eyebrow="Recent"
            title="Your applications"
            action={
              counts.total > 0 ? (
                <PortalButton onClick={() => onNavigate("applications")} tone="ghost">
                  See all {counts.total}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </PortalButton>
              ) : undefined
            }
          />
          <h2 id="recent-heading" className="sr-only">
            Recent applications
          </h2>

          {recent.length ? (
            <ul className="mt-5 space-y-2.5">
              {recent.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/customer/applications/${application.id}`}
                    className="lg-card lg-raise lg-sheen flex items-center gap-3 p-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)] sm:p-4"
                  >
                    <PortalIcon tone="muted">
                      <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
                    </PortalIcon>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-extrabold text-[var(--dc-ink)]">
                        {application.service_name}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] font-semibold text-[var(--dc-muted)]">
                        Applied {formatDate(application.created_at)}
                      </span>
                    </span>
                    <span className="shrink-0">
                      <StatusBadge status={application.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={<FileText className="h-5 w-5" aria-hidden="true" />}
                title="No applications yet"
                description="Pick a service and we will guide you through it — documents, fees and follow-ups included."
                actionHref="/apply"
                actionLabel="Browse services"
              />
            </div>
          )}
        </section>
      </Reveal>

      {/* ── Refer & earn nudge ───────────────────────────────────────── */}
      <Reveal>
        <PortalCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <PortalIcon tone="flame">
              <Gift className="h-[18px] w-[18px]" aria-hidden="true" />
            </PortalIcon>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-[var(--dc-ink)]">Refer a friend</p>
              <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                Your reward lands in the same wallet you spend from.
              </p>
            </div>
          </div>
          <PortalButton onClick={() => onNavigate("wallet")} tone="ghost" className="shrink-0">
            Get your code
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </PortalButton>
        </PortalCard>
      </Reveal>
    </div>
  );
}
