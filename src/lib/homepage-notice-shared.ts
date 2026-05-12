export const homepageNoticeColorThemes = ["blue-orange", "blue", "orange", "green", "slate"] as const;

export type HomepageNoticeColorTheme = (typeof homepageNoticeColorThemes)[number];

export type HomepageNotice = {
  id: string;
  notice_text: string;
  link_url: string | null;
  emoji_icon: string | null;
  color_theme: HomepageNoticeColorTheme;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function isHomepageNoticeColorTheme(value: string): value is HomepageNoticeColorTheme {
  return homepageNoticeColorThemes.includes(value as HomepageNoticeColorTheme);
}

export function isValidHomepageNoticeLink(value: string | null) {
  if (!value) {
    return true;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
