import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getActiveHomepageNotices, type HomepageNotice } from "@/lib/homepage-notices";
import { cn } from "@/lib/utils";

type NoticeMode = "marquee" | "chips" | "rotator";

const themeClasses: Record<HomepageNotice["color_theme"], string> = {
  "blue-orange": "border-orange-200/70 bg-white/85 text-slate-950 shadow-orange-500/10",
  blue: "border-blue-200/75 bg-blue-50/90 text-blue-900 shadow-blue-600/10",
  orange: "border-orange-200/80 bg-orange-50/95 text-orange-950 shadow-orange-500/10",
  green: "border-emerald-200/80 bg-emerald-50/95 text-emerald-950 shadow-emerald-500/10",
  slate: "border-slate-200 bg-slate-50 text-slate-900 shadow-slate-500/10",
};

function isExternalLink(link: string | null) {
  return Boolean(link && /^https?:\/\//i.test(link));
}

function NoticePill({ notice, compact = false }: { notice: HomepageNotice; compact?: boolean }) {
  const content = (
    <span
      className={cn(
        "group inline-flex h-9 max-w-[84vw] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold leading-none shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:h-10 md:max-w-none md:px-4 md:text-sm",
        compact ? "h-8 md:h-9" : "",
        themeClasses[notice.color_theme],
      )}
    >
      {notice.emoji_icon ? <span className="text-base leading-none md:text-lg">{notice.emoji_icon}</span> : null}
      <span className="truncate">{notice.notice_text}</span>
      {notice.link_url ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-current opacity-65 transition group-hover:translate-x-0.5" /> : null}
    </span>
  );

  if (!notice.link_url) {
    return content;
  }

  if (isExternalLink(notice.link_url)) {
    return (
      <a href={notice.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0">
        {content}
      </a>
    );
  }

  return (
    <Link href={notice.link_url} className="inline-flex shrink-0">
      {content}
    </Link>
  );
}

function NoticeTrack({ notices, mode }: { notices: HomepageNotice[]; mode: NoticeMode }) {
  if (mode === "chips") {
    return (
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-1.5 md:justify-center md:px-6">
        {notices.map((notice) => (
          <NoticePill key={notice.id} notice={notice} compact />
        ))}
      </div>
    );
  }

  if (mode === "rotator") {
    return (
      <div className="relative h-10 overflow-hidden md:h-12">
        {notices.map((notice, index) => (
          <div key={notice.id} className="homepage-notice-rotator absolute inset-0 flex items-center justify-center px-4" style={{ animationDelay: `${index * 3}s` }}>
            <NoticePill notice={notice} compact />
          </div>
        ))}
      </div>
    );
  }

  const marqueeNotices = notices.length > 1 ? [...notices, ...notices] : notices;

  return (
    <div className="homepage-notice-marquee-wrap overflow-hidden py-1.5">
      <div className={cn("flex w-max items-center gap-2 px-4 md:gap-3 md:px-6", notices.length > 1 ? "homepage-notice-marquee" : "mx-auto")}>
        {marqueeNotices.map((notice, index) => (
          <NoticePill key={`${notice.id}-${index}`} notice={notice} compact />
        ))}
      </div>
    </div>
  );
}

export async function HomepageOfferNoticeBar({ mode = "marquee" }: { mode?: NoticeMode }) {
  const notices = await getActiveHomepageNotices();

  if (!notices.length) {
    return null;
  }

  return (
    <section className="relative z-20 bg-white px-3 pb-2 pt-2 md:px-6 md:pb-3" aria-label="Homepage offers">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-blue-100/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.94),rgba(255,247,237,0.9))] shadow-[0_10px_28px_rgba(37,99,235,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
        <NoticeTrack notices={notices} mode={mode} />
      </div>
    </section>
  );
}
