import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { homepageNoticeColorThemes, isHomepageNoticeColorTheme, isValidHomepageNoticeLink } from "@/lib/homepage-notice-shared";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function friendlySupabaseError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("homepage_notices") || lowerMessage.includes("relation") || lowerMessage.includes("does not exist")) {
    return "Homepage notices database table is not available yet. Please apply the Supabase homepage notices migration.";
  }

  return message;
}

async function requireAdminJson() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    return { error: jsonError("Please log in before managing homepage notices.", 401), user: null };
  }

  if (!isAdminRole(role)) {
    return { error: jsonError("You do not have permission to manage homepage notices.", 403), user: null };
  }

  return { error: null, user };
}

function nullableText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseBoolean(formData: FormData, key: string, fallback: boolean) {
  const value = formData.get(key);

  if (value === null) {
    return fallback;
  }

  return String(value) === "true" || String(value) === "on";
}

function parseSortOrder(formData: FormData) {
  const rawValue = String(formData.get("sort_order") ?? "0").trim();
  const sortOrder = Number.parseInt(rawValue || "0", 10);

  return Number.isNaN(sortOrder) ? null : sortOrder;
}

function buildNoticePayload(formData: FormData) {
  const noticeText = String(formData.get("notice_text") ?? "").trim();
  const linkUrl = nullableText(formData, "link_url");
  const emojiIcon = nullableText(formData, "emoji_icon");
  const colorTheme = String(formData.get("color_theme") ?? "blue-orange").trim();
  const sortOrder = parseSortOrder(formData);

  if (!noticeText) {
    return { error: "Notice text is required.", payload: null };
  }

  if (noticeText.length > 120) {
    return { error: "Notice text must be 120 characters or fewer.", payload: null };
  }

  if (emojiIcon && emojiIcon.length > 8) {
    return { error: "Emoji/icon must be short.", payload: null };
  }

  if (!isValidHomepageNoticeLink(linkUrl)) {
    return { error: "Link must be an internal path or a valid HTTP/HTTPS URL.", payload: null };
  }

  if (!isHomepageNoticeColorTheme(colorTheme)) {
    return { error: `Color theme must be one of: ${homepageNoticeColorThemes.join(", ")}.`, payload: null };
  }

  if (sortOrder === null) {
    return { error: "Sort order must be a number.", payload: null };
  }

  return {
    error: null,
    payload: {
      notice_text: noticeText,
      link_url: linkUrl,
      emoji_icon: emojiIcon,
      color_theme: colorTheme,
      sort_order: sortOrder,
      is_active: parseBoolean(formData, "is_active", true),
    },
  };
}

export async function GET() {
  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Homepage notices are not configured on the server.", 500);
    }

    const { data: notices, error } = await supabase
      .from("homepage_notices")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(friendlySupabaseError(error.message), 500);
    }

    return NextResponse.json({ notices: notices ?? [] });
  } catch (error) {
    console.error("[api/admin/homepage-notices] List failed", error);
    return jsonError("Homepage notices could not be loaded.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Homepage notice creation is not configured on the server.", 500);
    }

    const formData = await request.formData();
    const { error: payloadError, payload } = buildNoticePayload(formData);

    if (payloadError || !payload) {
      return jsonError(payloadError || "Homepage notice details are invalid.", 400);
    }

    const { data: notice, error } = await supabase
      .from("homepage_notices")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return jsonError(friendlySupabaseError(error.message), 500);
    }

    revalidatePath("/");
    revalidatePath("/admin/homepage-notices");

    return NextResponse.json({ notice, message: "Homepage notice created successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-notices] Create failed", error);
    return jsonError("Homepage notice could not be created. Please try again.", 500);
  }
}
