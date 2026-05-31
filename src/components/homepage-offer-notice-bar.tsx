import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getActiveHomepageNotices, type HomepageNotice } from "@/lib/homepage-notices";

function isExternalLink(link: string | null) {
  return Boolean(link && /^https?:\/\//i.test(link));
}

const fallbackOffers = [
  { text: "GST Registration", emoji: "📋" },
  { text: "ITR Filing", emoji: "💰" },
  { text: "PM Vishwakarma", emoji: "🏗️" },
  { text: "Credit Cards", emoji: "💳" },
  { text: "Passport Services", emoji: "🛂" },
  { text: "Vehicle Insurance", emoji: "🚗" },
  { text: "Driving Licence", emoji: "🪪" },
];

function NoticeItem({ notice }: { notice: HomepageNotice }) {
  const content = (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-white/90 md:text-xs">
      {notice.emoji_icon ? <span className="text-sm leading-none">{notice.emoji_icon}</span> : null}
      <span>{notice.notice_text}</span>
      {notice.link_url ? <ChevronRight className="h-3 w-3 shrink-0 text-white/50" /> : null}
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

function FallbackItem({ text, emoji }: { text: string; emoji: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-white/90 md:text-xs">
      <span className="text-sm leading-none">{emoji}</span>
      <span>{text}</span>
    </span>
  );
}

function Separator() {
  return <span className="shrink-0 text-white/25 mx-4" aria-hidden="true">•</span>;
}

export async function HomepageOfferNoticeBar() {
  const notices = await getActiveHomepageNotices();
  const hasNotices = notices.length > 0;

  return (
    <section
      className="relative z-20 w-full bg-gradient-to-r from-[#071326] via-[#0d2a52] to-[#071326] print:hidden"
      aria-label="Current offers"
    >
      <div className="overflow-hidden py-2.5">
        <div className="marquee-track" aria-live="off">
          {/* First set */}
          {hasNotices
            ? notices.map((notice, i) => (
                <span key={`a-${notice.id}`} className="inline-flex items-center">
                  {i > 0 ? <Separator /> : null}
                  <NoticeItem notice={notice} />
                </span>
              ))
            : fallbackOffers.map((offer, i) => (
                <span key={`a-${i}`} className="inline-flex items-center">
                  {i > 0 ? <Separator /> : null}
                  <FallbackItem text={offer.text} emoji={offer.emoji} />
                </span>
              ))}

          {/* Spacer */}
          <Separator />

          {/* Duplicate for seamless loop */}
          {hasNotices
            ? notices.map((notice, i) => (
                <span key={`b-${notice.id}`} className="inline-flex items-center">
                  {i > 0 ? <Separator /> : null}
                  <NoticeItem notice={notice} />
                </span>
              ))
            : fallbackOffers.map((offer, i) => (
                <span key={`b-${i}`} className="inline-flex items-center">
                  {i > 0 ? <Separator /> : null}
                  <FallbackItem text={offer.text} emoji={offer.emoji} />
                </span>
              ))}
        </div>
      </div>
    </section>
  );
}
