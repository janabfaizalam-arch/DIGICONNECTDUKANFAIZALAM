import Link from "next/link";

import { CommandCenter } from "@/components/content-engine/command-center";
import {
  EmptyState,
  GovernmentBadge,
  NotInstalledNotice,
  SectionCard,
  StageBadge,
  StatCard,
} from "@/components/content-engine/primitives";
import { loadDashboard } from "@/lib/content-engine/dashboard";
import { DASHBOARD_BUCKETS } from "@/lib/content-engine/pipeline";

export const dynamic = "force-dynamic";

/**
 * The Content Engine's front page.
 *
 * Ordered by what somebody opening it at nine in the morning actually needs:
 * what is waiting for a decision, then what the week did, then what is coming
 * up. The pipeline counts are second rather than first because a row of
 * twelve numbers is a status report, not a place to start work.
 */
export default async function Page() {
  const data = await loadDashboard();

  if (!data.installed) {
    return (
      <div className="space-y-4">
        <NotInstalledNotice />
        <SectionCard title="What this will do once the tables exist">
          <ol className="space-y-1.5 text-[13px] font-medium leading-snug text-[var(--dc-body)]">
            <li>1. Ideas mine ho jaate hain — customer sawal, service list aur sarkari updates se.</li>
            <li>2. Har idea ke 5 hooks, aur best wala recommend.</li>
            <li>3. Master content brand voice mein likha jaata hai.</li>
            <li>4. Sarkari claims official source ke saath fact check hote hain.</li>
            <li>5. Design spec aur har platform ka apna version banta hai.</li>
            <li>6. Aap approve karte hain — tab jaake schedule aur publish.</li>
            <li>7. Numbers wapas aakar agle hafte ke ideas ko sudhaarte hain.</li>
          </ol>
        </SectionCard>
      </div>
    );
  }

  const money = (value: number) => new Intl.NumberFormat("en-IN").format(Math.round(value));

  return (
    <div className="space-y-4">
      <CommandCenter />

      {(data.awaitingApproval.length > 0 || data.failed.length > 0) && (
        <SectionCard
          title="Aapka intezaar ho raha hai"
          subtitle="Jab tak koi insaan approve nahi karta, kuch bhi publish nahi hoga."
        >
          <div className="space-y-2">
            {data.awaitingApproval.map((post) => (
              <Link
                key={post.id}
                href={`/admin/content-engine/approval?post=${post.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[0.9rem] border border-amber-200 bg-amber-50/70 px-3 py-2 hover:border-amber-400"
              >
                <span className="text-[13px] font-bold text-[var(--dc-ink)]">{post.masterTopic}</span>
                <span className="flex items-center gap-2">
                  {post.government && <GovernmentBadge compact />}
                  <StageBadge status={post.status} />
                </span>
              </Link>
            ))}
            {data.failed.map((post) => (
              <Link
                key={post.id}
                href={`/admin/content-engine/drafts?post=${post.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[0.9rem] border border-rose-200 bg-rose-50/70 px-3 py-2 hover:border-rose-400"
              >
                <span className="text-[13px] font-bold text-[var(--dc-ink)]">{post.masterTopic}</span>
                <StageBadge status={post.status} />
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Pipeline" subtitle="Har stage par kitna kaam khada hai.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {DASHBOARD_BUCKETS.map((bucket) => (
            <StatCard
              key={bucket.id}
              label={bucket.label}
              value={data.counts[bucket.id] ?? 0}
              tone={bucket.id === "failed" && (data.counts.failed ?? 0) > 0 ? "warn" : "default"}
              href={
                bucket.id === "approval"
                  ? "/admin/content-engine/approval"
                  : bucket.id === "new-ideas" || bucket.id === "ranked"
                    ? "/admin/content-engine/ideas"
                    : bucket.id === "fact-check"
                      ? "/admin/content-engine/fact-check"
                      : bucket.id === "scheduled"
                        ? "/admin/content-engine/calendar"
                        : "/admin/content-engine/drafts"
              }
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Is hafte" subtitle="Pichhle 7 din mein jo publish hua, uske numbers.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard label="Posts" value={data.postsThisWeek} />
          <StatCard label="Reach" value={money(data.week.reach)} />
          <StatCard label="Engagement" value={money(data.week.likes + data.week.comments)} />
          <StatCard label="Shares" value={money(data.week.shares)} />
          <StatCard label="Saves" value={money(data.week.saves)} />
          <StatCard label="Comments" value={money(data.week.comments)} />
          <StatCard label="Enquiries" value={money(data.week.enquiries)} tone="good" />
          <StatCard label="Leads" value={money(data.week.leads)} tone="good" />
          <StatCard label="Customers" value={money(data.week.customers)} tone="good" />
          <StatCard
            label="Revenue"
            value={data.week.revenue ? `₹${money(data.week.revenue)}` : "—"}
            hint={data.week.revenue ? undefined : "Analytics screen par bhar sakte hain"}
          />
        </div>
      </SectionCard>

      {data.latestLearning && (
        <SectionCard title="Numbers kya keh rahe hain" subtitle={`Last analysed ${new Date(data.latestLearning.createdAt).toLocaleDateString("en-IN")}`}>
          <p className="text-[13.5px] font-medium leading-relaxed text-[var(--dc-body)]">
            {data.latestLearning.summary}
          </p>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Sabse achha chala" subtitle="Enquiries aur shares ke hisaab se, sirf likes se nahi.">
          {data.top.length ? (
            <ul className="space-y-2">
              {data.top.map((post) => (
                <li key={post.postId} className="rounded-[0.9rem] border border-slate-200 px-3 py-2">
                  <p className="text-[13px] font-bold text-[var(--dc-ink)]">{post.topic}</p>
                  <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                    {post.metrics.enquiries} enquiries · {post.metrics.shares} shares · {money(post.metrics.reach)} reach
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Abhi koi published post nahi hai"
              detail="Pehla post publish hone ke baad yahan uske numbers dikhne lagenge."
            />
          )}
        </SectionCard>

        <SectionCard title="Sabse kam chala" subtitle="Jinke numbers hain aur kam hain. Naye post yahan nahi aate.">
          {data.worst.length ? (
            <ul className="space-y-2">
              {data.worst.map((post) => (
                <li key={post.postId} className="rounded-[0.9rem] border border-slate-200 px-3 py-2">
                  <p className="text-[13px] font-bold text-[var(--dc-ink)]">{post.topic}</p>
                  <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                    {post.metrics.enquiries} enquiries · {money(post.metrics.reach)} reach
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Abhi tulna karne layak data nahi hai" detail="Kuch posts ke numbers aane do." />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Aage kya scheduled hai" action={<Link className="text-[12.5px] font-bold text-[var(--dc-blue-700)]" href="/admin/content-engine/calendar">Calendar</Link>}>
        {data.nextScheduled.length ? (
          <ul className="divide-y divide-slate-100">
            {data.nextScheduled.map((row) => (
              <li key={`${row.postId}-${row.platform}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-[13px] font-semibold text-[var(--dc-ink)]">{row.topic}</span>
                <span className="text-[12px] font-semibold text-[var(--dc-muted)]">
                  {row.platform} · {new Date(row.scheduledAt).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Kuch scheduled nahi hai" detail="Approve ki hui post ko calendar par rakhiye." />
        )}
      </SectionCard>
    </div>
  );
}
