import { getActiveHomepageNotices, type HomepageNotice } from "@/lib/homepage-notices";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { HomepageNoticeControls } from "@/components/homepage/homepage-notice-controls";

function isExternalLink(link: string | null) {
  return Boolean(link && /^https?:\/\//i.test(link));
}

function NoticeItem({ notice }: { notice: HomepageNotice }) {
  const content = (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap pr-10 text-[11px] font-bold text-white md:text-xs">
      {notice.emoji_icon ? <span className="text-sm leading-none" aria-hidden="true">{notice.emoji_icon}</span> : null}
      <span>{notice.notice_text}</span>
      {notice.link_url ? <ChevronRight className="h-3 w-3 shrink-0 text-white/60" aria-hidden="true" /> : null}
    </span>
  );

  if (!notice.link_url) return content;

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

function Separator() {
  return (
    <span className="mx-4 shrink-0 text-[var(--home-orange)]" aria-hidden="true">
      •
    </span>
  );
}

/** Backend-driven announcement strip. Hidden when no active notices exist. */
export async function HomepageOfferNoticeBar() {
  const notices = await getActiveHomepageNotices();
  if (!notices.length) return null;

  return (
    <HomepageNoticeControls>
      <section
        className="relative z-20 w-full bg-[var(--home-navy)] print:hidden"
        aria-label="Service announcements"
        data-announcement="true"
      >
        <div className="overflow-hidden py-2.5 pr-20">
          <div className="marquee-track motion-reduce:animate-none" aria-live="polite">
            {notices.map((notice, i) => (
              <span key={`a-${notice.id}`} className="inline-flex items-center">
                {i > 0 ? <Separator /> : null}
                <NoticeItem notice={notice} />
              </span>
            ))}
            {notices.map((notice, i) => (
              <span key={`b-${notice.id}`} className="inline-flex items-center motion-reduce:hidden" aria-hidden="true">
                {i > 0 ? <Separator /> : null}
                <NoticeItem notice={notice} />
              </span>
            ))}
          </div>
        </div>
      </section>
    </HomepageNoticeControls>
  );
}
