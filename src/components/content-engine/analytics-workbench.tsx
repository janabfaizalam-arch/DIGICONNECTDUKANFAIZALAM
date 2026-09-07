"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Save } from "lucide-react";

import {
  EmptyState,
  ErrorNotice,
  NotInstalledNotice,
  SectionCard,
  Spinner,
  StatCard,
} from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import type { LearnComparison, PostPerformance } from "@/lib/content-engine/analytics";
import { ALL_PLATFORMS } from "@/lib/content-engine/platforms";
import { PLATFORM_LABEL, type ContentPlatform } from "@/lib/content-engine/types";

/**
 * What each post did, and what that means for the next one.
 *
 * Numbers can be typed in. Most of these platforms will not hand over
 * per-post metrics until their APIs are connected, and several never will for
 * a small account — so a shop that reads its own Instagram insights and enters
 * four figures gets exactly the same analysis as one with a full integration.
 * The four that matter most, enquiries and leads and customers and revenue,
 * were never going to come from a platform anyway: no platform knows somebody
 * walked into the shop.
 */
export function AnalyticsWorkbench() {
  const { success, error: toastError } = useToast();

  const [posts, setPosts] = useState<PostPerformance[]>([]);
  const [comparison, setComparison] = useState<LearnComparison | null>(null);
  const [learning, setLearning] = useState<{ summary: string; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);

  const [entry, setEntry] = useState({
    postId: "",
    platform: "INSTAGRAM" as ContentPlatform,
    reach: "",
    likes: "",
    comments: "",
    shares: "",
    saves: "",
    enquiries: "",
    leads: "",
    customers: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/content-engine/analytics");
      const json = (await response.json()) as {
        posts?: PostPerformance[];
        comparison?: LearnComparison;
        latestLearning?: { summary: string; createdAt: string } | null;
        error?: string;
        code?: string;
      };
      if (json.code === "not_installed") {
        setNotInstalled(true);
        return;
      }
      if (!response.ok) throw new Error(json.error || "Analytics load nahi ho paaye.");
      setPosts(json.posts ?? []);
      setComparison(json.comparison ?? null);
      setLearning(json.latestLearning ?? null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analytics load nahi ho paaye.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const record = async () => {
    if (!entry.postId) {
      toastError("Kaun si post ke numbers hain?");
      return;
    }
    setBusy("record");
    try {
      const number = (value: string) => Number(value) || 0;
      const response = await fetch("/api/admin/content-engine/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: [
            {
              postId: entry.postId,
              platform: entry.platform,
              reach: number(entry.reach),
              likes: number(entry.likes),
              comments: number(entry.comments),
              shares: number(entry.shares),
              saves: number(entry.saves),
              enquiries: number(entry.enquiries),
              leads: number(entry.leads),
              customers: number(entry.customers),
            },
          ],
        }),
      });
      const json = (await response.json()) as { saved?: number; error?: string };
      if (!response.ok) throw new Error(json.error || "Numbers save nahi hue.");
      success("Numbers save ho gaye.");
      await load();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Numbers save nahi hue.");
    } finally {
      setBusy(null);
    }
  };

  const analyse = async () => {
    setBusy("learn");
    setError(null);
    try {
      const response = await fetch("/api/admin/content-engine/analytics", { method: "PUT" });
      const json = (await response.json()) as { result?: { summary: string }; error?: string };
      if (!response.ok || !json.result) throw new Error(json.error || "Analysis nahi ho paya.");
      success("Analysis ho gaya. Agle hafte ke ideas ispar bante hain.");
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Analysis nahi ho paya.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  if (notInstalled) return <NotInstalledNotice />;
  if (loading) return <Spinner label="Numbers khul rahe hain…" />;

  const money = (value: number) => new Intl.NumberFormat("en-IN").format(Math.round(value));

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}

      {comparison && (
        <SectionCard title="Kul milakar">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            <StatCard label="Posts" value={posts.length} />
            <StatCard label="Reach" value={money(comparison.totals.reach)} />
            <StatCard label="Shares" value={money(comparison.totals.shares)} />
            <StatCard label="Saves" value={money(comparison.totals.saves)} />
            <StatCard label="Enquiries" value={money(comparison.totals.enquiries)} tone="good" />
            <StatCard label="Customers" value={money(comparison.totals.customers)} tone="good" />
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Numbers kya keh rahe hain"
        action={
          <Button className="h-9 px-4 text-[12.5px]" isLoading={busy === "learn"} onClick={() => void analyse()}>
            <BarChart3 className="h-4 w-4" />
            Analyse kijiye
          </Button>
        }
      >
        {learning ? (
          <>
            <p className="text-[13.5px] font-medium leading-relaxed text-[var(--dc-body)]">{learning.summary}</p>
            <p className="mt-1 text-[11.5px] font-semibold text-[var(--dc-muted)]">
              {new Date(learning.createdAt).toLocaleString("en-IN")}
            </p>
          </>
        ) : comparison?.observations.length ? (
          <ul className="space-y-1">
            {comparison.observations.map((note) => (
              <li key={note} className="text-[13px] font-medium leading-snug text-[var(--dc-body)]">
                • {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] font-medium text-[var(--dc-muted)]">Abhi tulna karne layak data nahi hai.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Numbers khud daaliye"
        subtitle="Instagram insights ya WhatsApp se dekhkar bhar dijiye. Enquiries aur customers to platform kabhi nahi bataayega."
      >
        {posts.length === 0 ? (
          <EmptyState title="Abhi koi published post nahi hai" detail="Pehle kuch publish kijiye." />
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={entry.postId}
                onChange={(event) => setEntry({ ...entry, postId: event.target.value })}
                className="h-11 rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
              >
                <option value="">Kaun si post?</option>
                {posts.map((post) => (
                  <option key={post.postId} value={post.postId}>
                    {post.topic}
                  </option>
                ))}
              </select>
              <select
                value={entry.platform}
                onChange={(event) => setEntry({ ...entry, platform: event.target.value as ContentPlatform })}
                className="h-11 rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
              >
                {ALL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {PLATFORM_LABEL[platform]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["reach", "likes", "comments", "shares", "saves", "enquiries", "leads", "customers"] as const).map(
                (field) => (
                  <label key={field} className="block">
                    <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">{field}</span>
                    <input
                      inputMode="numeric"
                      value={entry[field]}
                      onChange={(event) => setEntry({ ...entry, [field]: event.target.value })}
                      className="h-10 w-full rounded-[0.7rem] border border-slate-200 px-3 text-[13px] font-semibold outline-none focus:border-[var(--dc-blue-600)]"
                    />
                  </label>
                ),
              )}
            </div>

            <Button className="mt-3 h-9 px-4 text-[12.5px]" isLoading={busy === "record"} onClick={() => void record()}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </>
        )}
      </SectionCard>

      {comparison && comparison.top.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Top posts">
            <ul className="space-y-2">
              {comparison.top.map((post) => (
                <li key={post.postId} className="rounded-[0.8rem] border border-emerald-200 bg-emerald-50/50 px-3 py-2">
                  <p className="text-[13px] font-bold text-[var(--dc-ink)]">{post.topic}</p>
                  <p className="text-[11.5px] font-semibold text-[var(--dc-muted)]">
                    {post.metrics.enquiries} enquiries · {post.metrics.shares} shares · score {post.score}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Bottom posts">
            <ul className="space-y-2">
              {comparison.bottom.map((post) => (
                <li key={post.postId} className="rounded-[0.8rem] border border-slate-200 px-3 py-2">
                  <p className="text-[13px] font-bold text-[var(--dc-ink)]">{post.topic}</p>
                  <p className="text-[11.5px] font-semibold text-[var(--dc-muted)]">
                    {post.metrics.enquiries} enquiries · score {post.score}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
