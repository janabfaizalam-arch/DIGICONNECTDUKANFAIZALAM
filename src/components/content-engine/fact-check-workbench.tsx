"use client";

import { useState } from "react";
import { ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";

import { PostPicker } from "@/components/content-engine/post-list";
import {
  EmptyState,
  ErrorNotice,
  GovernmentBadge,
  SectionCard,
  StageBadge,
} from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import type { ContentPost, FactCheck, VerificationStatus } from "@/lib/content-engine/types";

/**
 * Stage 04 — claim by claim, with the source beside it.
 *
 * The screen is built around one refusal: a critical claim with no official
 * source stops the post. Everything on it exists to make that refusal
 * actionable — paste the notification, re-run the check, or mark the claim
 * verified yourself with your name against it.
 *
 * Sources are pasted rather than fetched. There is no configured list of
 * trustworthy pages here, and a checker that crawls whatever it finds and
 * feeds it to a model is how an unverified figure enters the one part of this
 * system whose whole point is that figures are verified.
 */
export function FactCheckWorkbench() {
  const { success, error: toastError } = useToast();

  const [post, setPost] = useState<ContentPost | null>(null);
  const [checks, setChecks] = useState<FactCheck[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState([{ title: "", url: "", publisher: "", excerpt: "" }]);

  const open = async (item: ContentPost) => {
    setBusy("open");
    try {
      const response = await fetch(`/api/admin/content-engine/fact-check?postId=${encodeURIComponent(item.id)}`);
      const json = (await response.json()) as { post?: ContentPost; checks?: FactCheck[]; error?: string };
      if (!response.ok || !json.post) throw new Error(json.error || "Post nahi khul paya.");
      setPost(json.post);
      setChecks(json.checks ?? []);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Post nahi khul paya.");
    } finally {
      setBusy(null);
    }
  };

  const runCheck = async () => {
    if (!post) return;
    setBusy("check");
    setError(null);
    try {
      const response = await fetch("/api/admin/content-engine/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          sources: sources.filter((source) => source.title.trim() && source.url.trim()),
        }),
      });
      const json = (await response.json()) as {
        post?: ContentPost;
        checks?: FactCheck[];
        blocking?: boolean;
        error?: string;
      };
      if (!response.ok || !json.post) throw new Error(json.error || "Fact check nahi ho paya.");
      setPost(json.post);
      setChecks(json.checks ?? []);
      success(
        json.blocking
          ? "Check ho gaya. Ek zaruri claim ka source nahi mila — wo yahin ruka rahega."
          : "Check ho gaya. Sab claims verified hain.",
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Fact check nahi ho paya.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  const review = async (check: FactCheck, status: VerificationStatus) => {
    if (!post) return;
    setBusy(check.id);
    try {
      const response = await fetch("/api/admin/content-engine/fact-check", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: check.id, postId: post.id, verificationStatus: status }),
      });
      const json = (await response.json()) as { post?: ContentPost; check?: FactCheck; error?: string };
      if (!response.ok || !json.check) throw new Error(json.error || "Save nahi hua.");
      setChecks((current) => current.map((item) => (item.id === check.id ? json.check! : item)));
      if (json.post) setPost(json.post);
      success(`Claim ${status} mark ho gaya, aapke naam ke saath.`);
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Save nahi hua.");
    } finally {
      setBusy(null);
    }
  };

  const tone = (status: VerificationStatus) =>
    status === "VERIFIED"
      ? "border-emerald-200 bg-emerald-50/60"
      : status === "REJECTED"
        ? "border-rose-200 bg-rose-50/60"
        : "border-amber-200 bg-amber-50/60";

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <PostPicker
        title="Fact check ka intezaar"
        subtitle="Sarkari jaankari wali har post yahan se guzarti hai."
        statuses={["FACT_CHECK_PENDING", "FACT_CHECKED", "DRAFT_READY", "APPROVAL_PENDING"]}
        selectedId={post?.id ?? null}
        onSelect={(item) => void open(item)}
        emptyTitle="Kuch check karne ko nahi hai"
        emptyDetail="Sarkari topic par post banne par wo apne aap yahan aa jaayegi."
      />

      <div className="space-y-4">
        {error && <ErrorNotice message={error} />}

        {!post ? (
          <EmptyState title="Baayen se ek post chuniye" detail="Uske sabhi claims aur unke source yahan dikhenge." />
        ) : (
          <>
            <SectionCard
              title={post.masterTopic}
              action={
                <span className="flex flex-wrap items-center gap-2">
                  {post.government && <GovernmentBadge compact />}
                  <StageBadge status={post.factCheckStatus} />
                </span>
              }
            >
              <p className="whitespace-pre-line text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">
                {post.hook}
                {"\n\n"}
                {post.body}
              </p>
            </SectionCard>

            <SectionCard
              title="Official source lagaiye"
              subtitle="Sarkari website ka link sabse achha hai. Bina source ke koi claim verified nahi hoga."
            >
              {sources.map((source, index) => (
                <div key={index} className="mb-2 grid gap-2 sm:grid-cols-2">
                  <input
                    value={source.title}
                    onChange={(event) =>
                      setSources((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Source ka naam (jaise: UP BOCW notification)"
                    className="h-10 rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
                  />
                  <input
                    value={source.url}
                    onChange={(event) =>
                      setSources((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, url: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="https://…gov.in/…"
                    className="h-10 rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
                  />
                  <textarea
                    value={source.excerpt}
                    onChange={(event) =>
                      setSources((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, excerpt: event.target.value } : item,
                        ),
                      )
                    }
                    rows={3}
                    placeholder="Us page par jo likha hai wo yahan paste kijiye — amount, eligibility, last date"
                    className="rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)] sm:col-span-2"
                  />
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-9 px-3 text-[12.5px]"
                  onClick={() => setSources((current) => [...current, { title: "", url: "", publisher: "", excerpt: "" }])}
                >
                  Ek aur source
                </Button>
                <Button className="h-9 px-4 text-[12.5px]" isLoading={busy === "check"} onClick={() => void runCheck()}>
                  <ShieldCheck className="h-4 w-4" />
                  Fact check chalaiye
                </Button>
              </div>
            </SectionCard>

            {checks.length > 0 && (
              <SectionCard title="Claims" subtitle="Har claim alag se. Jo zaruri hain wo upar hain.">
                <ul className="space-y-2">
                  {checks.map((check) => (
                    <li key={check.id} className={`rounded-[0.9rem] border p-3 ${tone(check.verificationStatus)}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-[240px] flex-1 text-[13px] font-bold leading-snug text-[var(--dc-ink)]">
                          {check.critical && <ShieldAlert className="mr-1 inline h-3.5 w-3.5 text-amber-700" />}
                          {check.claim}
                        </p>
                        <StageBadge status={check.verificationStatus} />
                      </div>

                      <p className="mt-1 text-[12px] font-medium text-[var(--dc-body)]">{check.notes}</p>

                      {check.sourceUrl ? (
                        <a
                          href={check.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--dc-blue-700)]"
                        >
                          {check.source || check.sourceUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="mt-1 text-[12px] font-bold text-amber-800">Koi source nahi mila.</p>
                      )}

                      <p className="mt-1 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                        Confidence {Math.round(check.confidence * 100)}% · checked{" "}
                        {check.checkedAt ? new Date(check.checkedAt).toLocaleDateString("en-IN") : "—"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["VERIFIED", "NEEDS_REVIEW", "REJECTED"] as VerificationStatus[]).map((status) => (
                          <Button
                            key={status}
                            variant="outline"
                            className="h-8 px-3 text-[11.5px]"
                            isLoading={busy === check.id}
                            onClick={() => void review(check, status)}
                          >
                            {status.replace(/_/g, " ")}
                          </Button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11.5px] font-semibold leading-snug text-[var(--dc-muted)]">
                  Aap khud koi claim VERIFIED mark karenge to aapka naam uske saath record ho jaata hai. Isi liye
                  &quot;AI ne kaha tha&quot; kabhi jawab nahi ban sakta.
                </p>
              </SectionCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
