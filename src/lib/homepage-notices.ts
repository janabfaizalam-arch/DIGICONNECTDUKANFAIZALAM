import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  homepageNoticeColorThemes,
  isHomepageNoticeColorTheme,
  isValidHomepageNoticeLink,
  type HomepageNotice,
  type HomepageNoticeColorTheme,
} from "@/lib/homepage-notice-shared";

export { homepageNoticeColorThemes, isHomepageNoticeColorTheme, isValidHomepageNoticeLink };
export type { HomepageNotice, HomepageNoticeColorTheme };

const noticeSelect = "id, notice_text, link_url, emoji_icon, color_theme, sort_order, is_active, created_at, updated_at";

export function getDefaultHomepageNotices(): HomepageNotice[] {
  const now = new Date().toISOString();

  return [
    {
      id: "default-itr-msme",
      notice_text: "ITR + MSME Combo Rs 699",
      link_url: "/combo/itr-msme",
      emoji_icon: "🔥",
      color_theme: "orange",
      sort_order: 10,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "default-credit-cards",
      notice_text: "Credit Card Offers Available",
      link_url: "/services/credit-cards---all-banks",
      emoji_icon: "💳",
      color_theme: "blue",
      sort_order: 20,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "default-referral",
      notice_text: "Refer & Earn Rs 200",
      link_url: "/signup",
      emoji_icon: "🎁",
      color_theme: "green",
      sort_order: 30,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "default-cashback",
      notice_text: "Get 20% Cashback in Wallet",
      link_url: "/services",
      emoji_icon: "💰",
      color_theme: "blue-orange",
      sort_order: 40,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];
}

export async function getActiveHomepageNotices(limit = 8): Promise<HomepageNotice[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return getDefaultHomepageNotices();
  }

  try {
    const { data, error } = await supabase
      .from("homepage_notices")
      .select(noticeSelect)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[homepage-notices] Failed to fetch active notices", error);
      return getDefaultHomepageNotices();
    }

    return data?.length ? (data as HomepageNotice[]) : getDefaultHomepageNotices();
  } catch (error) {
    console.error("[homepage-notices] Failed to fetch active notices", error);
    return getDefaultHomepageNotices();
  }
}

export async function getAllHomepageNotices(limit = 100): Promise<HomepageNotice[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("homepage_notices")
      .select(noticeSelect)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[homepage-notices] Failed to fetch admin notices", error);
      return [];
    }

    return (data ?? []) as HomepageNotice[];
  } catch (error) {
    console.error("[homepage-notices] Failed to fetch admin notices", error);
    return [];
  }
}
