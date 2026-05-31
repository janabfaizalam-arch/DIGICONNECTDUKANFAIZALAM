import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getActiveHomepageNotices, type HomepageNotice } from "@/lib/homepage-notices";
import { cn } from "@/lib/utils";

const themeClasses: Record<HomepageNotice["color_theme"], string> = {
  "blue-orange": "border-orange-200/70 bg-white/90 text-slate-950 shadow-orange-500/5",
  blue: "border-blue-200/75 bg-blue-50/95 text-blue-900 shadow-blue-600/5",
  orange: "border-orange-200/80 bg-orange-50/98 text-orange-950 shadow-orange-500/5",
  green: "border-emerald-200/80 bg-emerald-50/98 text-emerald-950 shadow-emerald-500/5",
  slate: "border-slate-200 bg-slate-50 text-slate-900 shadow-slate-500/5",
};

function isExternalLink(link: string | null) {
  return Boolean(link && /^https?:\/\//i.test(link));
}

function NoticePill({ notice }: { notice: HomepageNotice }) {
  const content = (
    <span
      className={cn(
        "group inline-flex h-8 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold leading-none shadow-sm transition md:h-9 md:px-4 md:text-sm md:hover:-translate-y-0.5 md:hover:shadow-md motion-reduce:transition-none bg-white/95",
        themeClasses[notice.color_theme],
      )}
    >
      {notice.emoji_icon ? <span className="text-sm leading-none md:text-base">{notice.emoji_icon}</span> : null}
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

export async function HomepageOfferNoticeBar() {
  const notices = await getActiveHomepageNotices();

  if (!notices.length) {
    return null;
  }

  return (
    <section className="relative z-20 mx-auto max-w-7xl px-3 sm:px-6 pt-3.5 pb-1 print:hidden" aria-label="Homepage offers">
      <div className="no-scrollbar flex touch-pan-x gap-2.5 overflow-x-auto overscroll-x-contain py-2 px-4 rounded-[24px] border border-white/50 bg-white/40 shadow-[0_8px_20px_rgba(15,23,42,0.03)] backdrop-blur-[4px] md:flex-wrap md:justify-center md:overflow-x-visible">
        {notices.map((notice) => (
          <NoticePill key={notice.id} notice={notice} />
        ))}
      </div>
    </section>
  );
}

