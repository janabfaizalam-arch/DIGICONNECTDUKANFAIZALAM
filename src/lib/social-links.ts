import { buildWhatsAppUrl, buildSupportWhatsAppMessage } from "@/lib/whatsapp";

/**
 * Central DigiConnect social configuration.
 * Only enabled links with valid https URLs are rendered.
 * Do not invent platform URLs — leave enabled:false until configured in admin/settings.
 */

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "youtube"
  | "x"
  | "linkedin"
  | "threads"
  | "pinterest"
  | "telegram"
  | "whatsapp";

export type SocialLink = {
  platform: SocialPlatform;
  label: string;
  handle?: string;
  url: string;
  enabled: boolean;
  accent: string;
};

const whatsappSupportUrl = buildWhatsAppUrl(
  buildSupportWhatsAppMessage({ page: "social", topic: "Social media enquiry" }),
);

/**
 * Display names provided by brand; URLs must be configured before enabling.
 * WhatsApp uses the real centralized support number.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    platform: "facebook",
    label: "Facebook",
    handle: "DigiConnect Dukan",
    url: "",
    enabled: false,
    accent: "bg-[#1877F2]/15 text-[#1877F2] border-[#1877F2]/25",
  },
  {
    platform: "instagram",
    label: "Instagram",
    handle: "RNOS.IN",
    url: "",
    enabled: false,
    accent: "bg-[#E1306C]/15 text-[#C13584] border-[#E1306C]/25",
  },
  {
    platform: "youtube",
    label: "YouTube",
    handle: "RNOS.IN",
    url: "",
    enabled: false,
    accent: "bg-[#FF0000]/15 text-[#FF0000] border-[#FF0000]/25",
  },
  {
    platform: "x",
    label: "X",
    handle: "RNOS.IN",
    url: "",
    enabled: false,
    accent: "bg-slate-200/80 text-slate-800 border-slate-300/60",
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    handle: "RNOS.IN",
    url: "",
    enabled: false,
    accent: "bg-[#0A66C2]/15 text-[#0A66C2] border-[#0A66C2]/25",
  },
  {
    platform: "threads",
    label: "Threads",
    handle: "RNOS.IN",
    url: "",
    enabled: false,
    accent: "bg-slate-200/80 text-slate-800 border-slate-300/60",
  },
  {
    platform: "pinterest",
    label: "Pinterest",
    handle: "RNOS.IN",
    url: "",
    enabled: false,
    accent: "bg-[#E60023]/15 text-[#E60023] border-[#E60023]/25",
  },
  {
    platform: "telegram",
    label: "Telegram",
    handle: "RNOS.IN",
    url: "",
    enabled: false,
    accent: "bg-[#26A5E4]/15 text-[#0088cc] border-[#26A5E4]/25",
  },
  {
    platform: "whatsapp",
    label: "WhatsApp",
    handle: "Support chat",
    url: whatsappSupportUrl,
    enabled: true,
    accent: "bg-[var(--dc-teal-soft)] text-[var(--dc-teal)] border-[var(--dc-teal)]/25",
  },
];

function isValidHttpsUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Platforms safe to render in UI. */
export function getEnabledSocialLinks() {
  return SOCIAL_LINKS.filter((link) => link.enabled && isValidHttpsUrl(link.url));
}

/** All platforms for admin/config visibility (includes disabled). */
export function getAllSocialLinks() {
  return SOCIAL_LINKS;
}
