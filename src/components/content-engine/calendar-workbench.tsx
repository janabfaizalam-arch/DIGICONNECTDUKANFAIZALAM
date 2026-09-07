"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Send } from "lucide-react";

import {
  EmptyState,
  ErrorNotice,
  NotInstalledNotice,
  SectionCard,
  Spinner,
  StageBadge,
} from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ALL_PLATFORMS } from "@/lib/content-engine/platforms";
import type { PlannedSlot } from "@/lib/content-engine/scheduler";
import {
  PLATFORM_LABEL,
  type ContentPlatform,
  type ContentPost,
  type ContentScheduleRow,
  type WeeklyPlan,
} from "@/lib/content-engine/types";

type ScheduledRow = ContentScheduleRow & { topic: string };

/**
 * The calendar.
 *
 * Two halves. What is already booked, and the empty slots the weekly rhythm
 * suggests — Monday a government update, Tuesday a customer problem, and so
 * on. Only approved posts appear in the dropdown, because scheduling is not a
 * way around the approval gate and the screen should not imply otherwise.
 */
export function CalendarWorkbench() {
  const { success, error: toastError } = useToast();

  const [rows, setRows] = useState<ScheduledRow[]>([]);
  const [suggestions, setSuggestions] = useState<PlannedSlot[]>([]);
  const [approved, setApproved] = useState<ContentPost[]>([]);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);

  const [postId, setPostId] = useState("");
  const [when, setWhen] = useState("");
  const [platforms, setPlatforms] = useState<ContentPlatform[]>(["INSTAGRAM", "FACEBOOK"]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/content-engine/schedule?days=21");
      const json = (await response.json()) as {
        scheduled?: ScheduledRow[];
        suggestions?: PlannedSlot[];
        approved?: ContentPost[];
        weeklyPlan?: WeeklyPlan;
        error?: string;
        code?: string;
      };
      if (json.code === "not_installed") {
        setNotInstalled(true);
        return;
      }
      if (!response.ok) throw new Error(json.error || "Calendar load nahi ho paya.");
      setRows(json.scheduled ?? []);
      setSuggestions(json.suggestions ?? []);
      setApproved(json.approved ?? []);
      setPlan(json.weeklyPlan ?? null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Calendar load nahi ho paya.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const schedule = async () => {
    if (!postId || !when) {
      toastError("Post aur time dono chuniye.");
      return;
    }
    setBusy("schedule");
    try {
      const response = await fetch("/api/admin/content-engine/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, platforms, scheduledAt: new Date(when).toISOString() }),
      });
      const json = (await response.json()) as { results?: { ok: boolean; message: string }[]; error?: string };
      if (!response.ok) throw new Error(json.error || "Schedule nahi ho paya.");

      const failed = (json.results ?? []).filter((result) => !result.ok);
      if (failed.length) throw new Error(failed[0].message);

      success("Calendar par rakh diya.");
      setPostId("");
      setWhen("");
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Schedule nahi ho paya.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  const publishNow = async (row: ScheduledRow) => {
    setBusy(row.id);
    try {
      const response = await fetch("/api/admin/content-engine/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: row.id }),
      });
      const json = (await response.json()) as { attempt?: { status: string; message: string }; error?: string };
      if (!response.ok || !json.attempt) throw new Error(json.error || "Publish nahi ho paya.");

      if (json.attempt.status === "PUBLISHED") success("Publish ho gaya.");
      else toastError(json.attempt.message);
      await load();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Publish nahi ho paya.");
    } finally {
      setBusy(null);
    }
  };

  if (notInstalled) return <NotInstalledNotice />;
  if (loading) return <Spinner label="Calendar khul raha hai…" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}

      <SectionCard title="Approve ki hui post schedule kijiye" subtitle="Sirf approved post hi calendar par jaa sakti hai.">
        {approved.length === 0 ? (
          <EmptyState
            title="Koi approved post nahi hai"
            detail="Approval screen par jaakar pehle koi post approve kijiye."
          />
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={postId}
                onChange={(event) => setPostId(event.target.value)}
                className="h-11 rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
              >
                <option value="">Kaun si post?</option>
                {approved.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.masterTopic}
                    {post.government ? " (sarkari)" : ""}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                className="h-11 rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_PLATFORMS.map((platform) => {
                const on = platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() =>
                      setPlatforms((current) =>
                        on ? current.filter((item) => item !== platform) : [...current, platform],
                      )
                    }
                    className={
                      "rounded-full border px-3 py-1 text-[12px] font-semibold " +
                      (on
                        ? "border-[var(--dc-blue-600)] bg-[var(--dc-blue-600)] text-white"
                        : "border-slate-200 bg-white text-[var(--dc-body)]")
                    }
                  >
                    {PLATFORM_LABEL[platform]}
                  </button>
                );
              })}
            </div>

            <Button className="mt-3 h-9 px-4 text-[12.5px]" isLoading={busy === "schedule"} onClick={() => void schedule()}>
              <CalendarClock className="h-4 w-4" />
              Schedule kijiye
            </Button>
          </>
        )}
      </SectionCard>

      <SectionCard title="Scheduled">
        {rows.length === 0 ? (
          <EmptyState title="Kuch scheduled nahi hai" detail="Upar se koi approved post calendar par rakhiye." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-[200px] flex-1">
                  <p className="text-[13px] font-bold text-[var(--dc-ink)]">{row.topic}</p>
                  <p className="text-[11.5px] font-semibold text-[var(--dc-muted)]">
                    {PLATFORM_LABEL[row.platform]} · {new Date(row.scheduledAt).toLocaleString("en-IN")}
                    {row.errorMessage ? ` · ${row.errorMessage}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <StageBadge status={row.publishingStatus} />
                  {(row.publishingStatus === "PENDING" || row.publishingStatus === "QUEUED") && (
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-[11.5px]"
                      isLoading={busy === row.id}
                      onClick={() => void publishNow(row)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Abhi publish
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Khali slots" subtitle="Aapke hafte ke rhythm ke hisaab se. Settings mein badal sakte hain.">
        {suggestions.length === 0 ? (
          <p className="text-[12.5px] font-medium text-[var(--dc-muted)]">Aage ke din bhare hue hain.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((slot) => (
              <li key={slot.date} className="rounded-[0.9rem] border border-dashed border-slate-300 p-3">
                <p className="text-[12px] font-bold uppercase text-[var(--dc-muted)]">
                  {slot.weekday} · {slot.time}
                </p>
                <p className="mt-0.5 text-[13px] font-bold text-[var(--dc-ink)]">{slot.theme}</p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                  {slot.date} · {slot.platforms.map((platform) => PLATFORM_LABEL[platform]).join(", ")}
                </p>
                <Button
                  variant="ghost"
                  className="mt-1.5 h-7 px-2 text-[11.5px]"
                  onClick={() => {
                    setWhen(slot.scheduledAt.slice(0, 16));
                    setPlatforms(slot.platforms);
                  }}
                >
                  Is slot mein rakhiye
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {plan && (
        <SectionCard title="Hafte ka rhythm" subtitle="Har din ka apna kaam. Settings screen par badal sakte hain.">
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(plan).map(([day, entry]) => (
              <li key={day} className="rounded-[0.8rem] border border-slate-200 px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-[var(--dc-muted)]">{day}</p>
                <p className="text-[12.5px] font-bold text-[var(--dc-ink)]">{entry.theme}</p>
                <p className="text-[11px] font-semibold text-[var(--dc-muted)]">{entry.time}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
