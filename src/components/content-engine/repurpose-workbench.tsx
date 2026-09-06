"use client";

import { useState } from "react";
import { RefreshCw, Share2 } from "lucide-react";

import { PostPicker } from "@/components/content-engine/post-list";
import { EmptyState, ErrorNotice, SectionCard, StageBadge } from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ALL_PLATFORMS, specFor } from "@/lib/content-engine/platforms";
import { PLATFORM_LABEL, type ContentPlatform, type ContentPost, type ContentVersion } from "@/lib/content-engine/types";

/**
 * Stage 06 — the same idea, packaged for each platform.
 *
 * Every version has its own regenerate button. That is the point of the
 * screen: an admin who likes six of the seven should be able to redo the
 * seventh without spending six more model calls and losing the six they were
 * happy with.
 */
export function RepurposeWorkbench() {
  const { success, error: toastError } = useToast();

  const [post, setPost] = useState<ContentPost | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (item: ContentPost) => {
    setBusy("open");
    try {
      const response = await fetch(`/api/admin/content-engine/repurpose?postId=${encodeURIComponent(item.id)}`);
      const json = (await response.json()) as { post?: ContentPost; versions?: ContentVersion[]; error?: string };
      if (!response.ok || !json.post) throw new Error(json.error || "Post nahi khul paya.");
      setPost(json.post);
      setVersions(json.versions ?? []);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Post nahi khul paya.");
    } finally {
      setBusy(null);
    }
  };

  const generate = async (platforms: ContentPlatform[], key: string) => {
    if (!post) return;
    setBusy(key);
    setError(null);
    try {
      const response = await fetch("/api/admin/content-engine/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, platforms }),
      });
      const json = (await response.json()) as {
        versions?: ContentVersion[];
        failures?: { platform: string; message: string }[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "Versions nahi ban paaye.");
      setVersions(json.versions ?? []);
      success(
        json.failures?.length
          ? `Ho gaya, lekin ${json.failures.map((failure) => failure.platform).join(", ")} nahi ban paaya.`
          : "Platform versions taiyaar hain.",
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Versions nahi ban paaye.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <PostPicker
        title="Repurpose"
        subtitle="Ek content, har platform ke hisaab se alag."
        statuses={["DRAFT_READY", "FACT_CHECKED", "DESIGN_READY", "APPROVAL_PENDING", "APPROVED"]}
        selectedId={post?.id ?? null}
        onSelect={(item) => void open(item)}
        emptyTitle="Koi post nahi hai"
        emptyDetail="Content likhne ke baad post yahan aa jaayegi."
      />

      <div className="space-y-4">
        {error && <ErrorNotice message={error} />}

        {!post ? (
          <EmptyState
            title="Baayen se ek post chuniye"
            detail="Har platform ka apna version yahan banega — copy-paste nahi, har jagah ka apna andaaz."
          />
        ) : (
          <>
            <SectionCard title={post.masterTopic} action={<StageBadge status={post.status} />}>
              <Button
                className="h-9 px-4 text-[12.5px]"
                isLoading={busy === "all"}
                onClick={() => void generate([...ALL_PLATFORMS], "all")}
              >
                <Share2 className="h-4 w-4" />
                Sab platforms ke versions banaiye
              </Button>
            </SectionCard>

            {ALL_PLATFORMS.map((platform) => {
              const version = versions.find((item) => item.platform === platform);
              const spec = specFor(platform);

              return (
                <SectionCard
                  key={platform}
                  title={PLATFORM_LABEL[platform]}
                  subtitle={spec.purpose}
                  action={
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-[11.5px]"
                      isLoading={busy === platform}
                      onClick={() => void generate([platform], platform)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {version ? "Dobara banaiye" : "Banaiye"}
                    </Button>
                  }
                >
                  {version ? (
                    <div className="space-y-1.5">
                      {version.title && (
                        <p className="text-[13.5px] font-bold text-[var(--dc-ink)]">{version.title}</p>
                      )}
                      <p className="whitespace-pre-line text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">
                        {version.caption || version.body}
                      </p>
                      {version.cta && (
                        <p className="text-[12.5px] font-bold text-[var(--dc-orange-700)]">{version.cta}</p>
                      )}
                      {version.hashtags.length > 0 && (
                        <p className="text-[12px] font-semibold text-[var(--dc-blue-700)]">
                          {version.hashtags.join(" ")}
                        </p>
                      )}
                      <p className="pt-1 text-[11px] font-semibold text-[var(--dc-muted)]">
                        {(version.caption || version.body).length} / {spec.captionLimit} characters ·{" "}
                        {version.mediaType.toLowerCase()}
                        {spec.clickableLinks ? "" : " · link click nahi hota"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12.5px] font-medium text-[var(--dc-muted)]">
                      Abhi is platform ka version nahi bana hai.
                    </p>
                  )}
                </SectionCard>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
