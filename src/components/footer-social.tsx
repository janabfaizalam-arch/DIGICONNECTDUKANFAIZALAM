import {
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Send,
  Youtube,
  type LucideIcon,
} from "lucide-react";

import type { SocialLink, SocialPlatform } from "@/lib/social-links";

/**
 * Brand marks Lucide does not carry.
 *
 * X, Threads and Pinterest have no Lucide glyph, and the footer previously fell
 * back to a generic "external link" arrow for them — three platforms rendered
 * as the same anonymous icon. These are the official mark shapes, drawn as
 * paths so they inherit `currentColor` and cost nothing to load.
 */
const BRAND_PATHS: Partial<Record<SocialPlatform, string>> = {
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  threads:
    "M16.29 11.13c-.1-.05-.2-.09-.3-.13-.18-3.28-1.97-5.16-4.98-5.18h-.04c-1.8 0-3.3.77-4.22 2.17l1.66 1.14c.69-1.04 1.76-1.26 2.56-1.26h.03c1 .01 1.75.3 2.24.86.36.41.6.98.72 1.7a13 13 0 0 0-2.87-.14c-2.89.17-4.75 1.85-4.62 4.19.06 1.19.66 2.21 1.68 2.88.86.56 1.97.84 3.12.78 1.52-.08 2.71-.66 3.55-1.72.63-.8 1.03-1.84 1.21-3.15.73.44 1.27 1.02 1.57 1.72.51 1.19.54 3.15-1.05 4.74-1.4 1.39-3.08 1.99-5.62 2.01-2.82-.02-4.95-.92-6.34-2.68C3.28 17.4 2.61 15.13 2.58 12c.03-3.13.7-5.4 2.01-7.06C5.98 3.18 8.11 2.28 10.93 2.26c2.84.02 5 .92 6.44 2.69.7.86 1.23 1.95 1.58 3.21l1.95-.52c-.42-1.55-1.09-2.89-2-4-1.83-2.25-4.52-3.4-7.96-3.43h-.01C7.48.24 4.83 1.4 3.03 3.67 1.43 5.69.6 8.5.57 11.99v.02c.03 3.49.86 6.3 2.46 8.32 1.8 2.27 4.45 3.43 7.89 3.45h.01c3.06-.02 5.21-.82 6.99-2.59 2.32-2.32 2.25-5.22 1.49-7-.55-1.28-1.6-2.32-3.03-3.02zm-4.87 5.34c-1.27.07-2.59-.5-2.65-1.71-.05-.9.64-1.9 2.73-2.02.24-.02.47-.02.7-.02.76 0 1.47.07 2.11.21-.24 2.98-1.64 3.47-2.89 3.54z",
  pinterest:
    "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026z",
};

const LUCIDE_ICON: Partial<Record<SocialPlatform, LucideIcon>> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  telegram: Send,
  whatsapp: MessageCircle,
};

/** The platform's own colour, used only on hover so the row stays calm. */
const BRAND_COLOR: Record<SocialPlatform, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  youtube: "#FF0000",
  x: "#0f172a",
  linkedin: "#0A66C2",
  threads: "#0f172a",
  pinterest: "#E60023",
  telegram: "#26A5E4",
  whatsapp: "#25D366",
};

function SocialMark({ platform }: { platform: SocialPlatform }) {
  const path = BRAND_PATHS[platform];
  if (path) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d={path} />
      </svg>
    );
  }
  const Icon = LUCIDE_ICON[platform];
  return Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null;
}

/**
 * The footer's social row.
 *
 * Each entry shows the mark *and* the handle, because an icon row alone makes
 * a customer guess which account is the real one — and for a company handling
 * identity documents, "is this actually them?" is a question worth answering in
 * the footer rather than leaving to a search.
 *
 * Only links with a real https URL are rendered. `social-links.ts` ships every
 * platform disabled with an empty URL and a comment forbidding invented ones,
 * and that is the right call: a plausible-looking guess at an Instagram handle
 * would send customers to a stranger's profile. Rows come from the
 * `site_social_links` table when it has any, so filling them in is a data
 * change, not a code one.
 */
export function FooterSocial({ links }: { links: SocialLink[] }) {
  if (!links.length) return null;

  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">Follow us</p>

      <ul className="mt-3 flex flex-wrap items-center gap-2">
        {links.map((link) => (
          <li key={link.platform}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                link.handle
                  ? `DigiConnect Dukan on ${link.label} — ${link.handle}`
                  : `DigiConnect Dukan on ${link.label}`
              }
              style={{ ["--brand" as string]: BRAND_COLOR[link.platform] }}
              className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-600 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-[0_8px_20px_-10px_var(--brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition duration-300 group-hover:bg-[var(--brand)] group-hover:text-white">
                <SocialMark platform={link.platform} />
              </span>
              <span className="whitespace-nowrap">{link.handle || link.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
