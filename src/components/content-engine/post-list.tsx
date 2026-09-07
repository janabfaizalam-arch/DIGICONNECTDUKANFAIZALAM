"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EmptyState,
  ErrorNotice,
  GovernmentBadge,
  NotInstalledNotice,
  SectionCard,
  StageBadge,
  Spinner,
} from "@/components/content-engine/primitives";
import type { ContentPost, ContentStatus } from "@/lib/content-engine/types";
import { cn } from "@/lib/utils";

/**
 * The list of posts at a given stage, shared by five screens.
 *
 * Drafts, fact check, designs, repurpose and approvals are all "pick a post,
 * then work on it", and writing that five times is how five screens end up
 * behaving differently for no reason. The stage-specific part is the panel on
 * the right, passed in as `children`.
 */
export function PostPicker({
  statuses,
  selectedId,
  onSelect,
  emptyTitle,
  emptyDetail,
  title,
  subtitle,
}: {
  statuses: ContentStatus[];
  selectedId: string | null;
  onSelect: (post: ContentPost) => void;
  emptyTitle: string;
  emptyDetail: string;
  title: string;
  subtitle?: string;
}) {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);

  const key = statuses.join(",");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = key
        .split(",")
        .filter(Boolean)
        .map((status) => `status=${encodeURIComponent(status)}`)
        .join("&");
      const response = await fetch(`/api/admin/content-engine/drafts?${query}`);
      const json = (await response.json()) as { posts?: ContentPost[]; error?: string; code?: string };
      if (json.code === "not_installed") {
        setNotInstalled(true);
        return;
      }
      if (!response.ok) throw new Error(json.error || "Posts load nahi ho paaye.");
      setPosts(json.posts ?? []);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Posts load nahi ho paaye.");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  if (notInstalled) return <NotInstalledNotice />;

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {error && <ErrorNotice message={error} />}
      {loading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <EmptyState title={emptyTitle} detail={emptyDetail} />
      ) : (
        <ul className="space-y-1.5">
          {posts.map((post) => (
            <li key={post.id}>
              <button
                type="button"
                onClick={() => onSelect(post)}
                className={cn(
                  "w-full rounded-[0.9rem] border px-3 py-2 text-left transition-colors",
                  selectedId === post.id
                    ? "border-[var(--dc-blue-600)] bg-[var(--dc-sky-soft)]"
                    : "border-slate-200 bg-white hover:border-[var(--dc-blue-600)]/40",
                )}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-[var(--dc-ink)]">{post.masterTopic}</span>
                  {post.government && <GovernmentBadge compact />}
                  <StageBadge status={post.status} />
                </span>
                <span className="mt-0.5 block text-[11.5px] font-medium text-[var(--dc-muted)]">{post.hook}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
