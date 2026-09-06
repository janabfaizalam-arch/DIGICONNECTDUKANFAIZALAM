"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, RotateCcw, XCircle } from "lucide-react";

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
import type { PublishDecision } from "@/lib/content-engine/publishing-guard";
import { PLATFORM_LABEL, type ContentDesign, type ContentPost, type ContentVersion, type FactCheck } from "@/lib/content-engine/types";

/**
 * The gate.
 *
 * Everything a reviewer needs to sign off is on one screen — the content, the
 * claims with their sources, the design brief and every platform version —
 * because a reviewer who has to open four screens will stop opening four
 * screens, and then the approval becomes a rubber stamp.
 *
 * The blockers panel is the honest part. It says exactly what is standing
 * between this post and going out, before the reviewer presses anything.
 */
export function ApprovalWorkbench() {
  const router = useRouter();
  const params = useSearchParams();
  const { success, error: toastError } = useToast();

  const [post, setPost] = useState<ContentPost | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [checks, setChecks] = useState<FactCheck[]>([]);
  const [designs, setDesigns] = useState<ContentDesign[]>([]);
  const [decision, setDecision] = useState<PublishDecision | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (id: string) => {
    setBusy("open");
    try {
      const response = await fetch(`/api/admin/content-engine/approval?postId=${encodeURIComponent(id)}`);
      const json = (await response.json()) as {
        post?: ContentPost;
        versions?: ContentVersion[];
        checks?: FactCheck[];
        designs?: ContentDesign[];
        blockers?: PublishDecision;
        error?: string;
      };
      if (!response.ok || !json.post) throw new Error(json.error || "Post nahi khul paya.");
      setPost(json.post);
      setVersions(json.versions ?? []);
      setChecks(json.checks ?? []);
      setDesigns(json.designs ?? []);
      setDecision(json.blockers ?? null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Post nahi khul paya.");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    const id = params.get("post");
    if (id) void open(id);
  }, [params, open]);

  const act = async (action: "approve" | "reject" | "send_back", sendBackTo?: string) => {
    if (!post) return;
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/admin/content-engine/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, action, reason, sendBackTo }),
      });
      const json = (await response.json()) as { post?: ContentPost; error?: string };
      if (!response.ok) throw new Error(json.error || "Ye kaam nahi ho paya.");

      if (action === "approve") {
        success("Approve ho gaya. Ab ise calendar par rakh dijiye.");
        router.push("/admin/content-engine/calendar");
        return;
      }
      success(action === "reject" ? "Reject ho gaya." : "AI ko wapas bhej diya.");
      await open(post.id);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Ye kaam nahi ho paya.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  const criticalUnverified = checks.filter((check) => check.critical && check.verificationStatus !== "VERIFIED");

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <PostPicker
        title="Approval ka intezaar"
        subtitle="Jab tak aap approve nahi karte, kuch publish nahi hoga."
        statuses={["APPROVAL_PENDING"]}
        selectedId={post?.id ?? null}
        onSelect={(item) => void open(item.id)}
        emptyTitle="Kuch approve karne ko nahi hai"
        emptyDetail="Jo content taiyaar ho jaata hai wo apne aap yahan aa jaata hai."
      />

      <div className="space-y-4">
        {error && <ErrorNotice message={error} />}

        {!post ? (
          <EmptyState
            title="Baayen se ek post chuniye"
            detail="Content, claims, design aur har platform ka version — sab ek saath dikhega."
          />
        ) : (
          <>
            {post.government && (
              <div className="rounded-[1rem] border border-amber-300 bg-amber-50 p-3">
                <GovernmentBadge />
                <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-amber-900">
                  Ye sarkari jaankari hai. Amount, eligibility ya last date galat gayi to nuksaan customer ka hota
                  hai — office ka chakkar, galat kaagaz, chhooti hui tarikh. Isi liye ye post automatic kabhi
                  publish nahi hogi, chahe settings mein kuch bhi ho.
                </p>
              </div>
            )}

            {decision && !decision.allowed && (
              <SectionCard title="Publish hone se pehle ye baaki hai">
                <ul className="space-y-1.5">
                  {decision.blockers.map((blocker) => (
                    <li key={blocker.code} className="flex items-start gap-2 text-[12.5px] font-semibold text-amber-900">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {blocker.message}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            <SectionCard
              title={post.masterTopic}
              subtitle={post.selectedAngle}
              action={
                <span className="flex flex-wrap items-center gap-2">
                  <StageBadge status={post.status} />
                  <StageBadge status={post.factCheckStatus} />
                </span>
              }
            >
              <p className="text-[14px] font-bold leading-snug text-[var(--dc-ink)]">{post.hook}</p>
              <p className="mt-2 whitespace-pre-line text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">
                {post.body}
              </p>
              <p className="mt-2 text-[13px] font-bold text-[var(--dc-orange-700)]">{post.cta}</p>
            </SectionCard>

            {checks.length > 0 && (
              <SectionCard
                title="Claims aur unke source"
                subtitle={
                  criticalUnverified.length
                    ? `${criticalUnverified.length} zaruri claim ka source abhi nahi hai.`
                    : "Har zaruri claim ka source laga hua hai."
                }
              >
                <ul className="space-y-2">
                  {checks.map((check) => (
                    <li key={check.id} className="rounded-[0.8rem] border border-slate-200 p-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-[220px] flex-1 text-[12.5px] font-bold text-[var(--dc-ink)]">
                          {check.claim}
                        </p>
                        <StageBadge status={check.verificationStatus} />
                      </div>
                      {check.sourceUrl && (
                        <a
                          href={check.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-bold text-[var(--dc-blue-700)]"
                        >
                          {check.source || check.sourceUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {designs.length > 0 && (
              <SectionCard title="Design">
                <div className="grid gap-2 sm:grid-cols-2">
                  {designs.map((design) => (
                    <div key={design.id} className="rounded-[0.8rem] border border-slate-200 p-3">
                      <p className="text-[11.5px] font-bold uppercase text-[var(--dc-muted)]">
                        {PLATFORM_LABEL[design.platform]} · {design.spec.canvas?.label}
                      </p>
                      <p className="mt-1 text-[14px] font-extrabold leading-tight text-[var(--dc-ink)]">
                        {design.spec.headline}
                      </p>
                      <p className="mt-0.5 text-[12px] font-medium text-[var(--dc-body)]">{design.spec.subheadline}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {versions.length > 0 && (
              <SectionCard title="Platform versions">
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div key={version.id} className="rounded-[0.8rem] border border-slate-200 p-3">
                      <p className="text-[11.5px] font-bold uppercase text-[var(--dc-muted)]">
                        {PLATFORM_LABEL[version.platform]}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                        {version.caption || version.body}
                      </p>
                      {version.hashtags.length > 0 && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[var(--dc-blue-700)]">
                          {version.hashtags.join(" ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Aapka faisla">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                placeholder="Reject ya wapas bhejne ki wajah (optional)"
                className="mb-3 w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
              />
              <div className="flex flex-wrap gap-2">
                <Button isLoading={busy === "approve"} onClick={() => void act("approve")} className="h-10 px-5">
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => router.push(`/admin/content-engine/drafts?post=${post.id}`)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-4"
                  isLoading={busy === "send_back"}
                  onClick={() => void act("send_back", "DRAFT_READY")}
                >
                  <RotateCcw className="h-4 w-4" />
                  AI ko wapas bhejiye
                </Button>
                <Button
                  variant="ghost"
                  className="h-10 px-4 text-rose-700"
                  isLoading={busy === "reject"}
                  onClick={() => void act("reject")}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}
