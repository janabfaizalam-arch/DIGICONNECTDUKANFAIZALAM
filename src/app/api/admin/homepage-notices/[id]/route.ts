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
      updated_at: new Date().toISOString(),
    },
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Homepage notice update is not configured on the server.", 500);
    }

    const formData = await request.formData();
    const { error: payloadError, payload } = buildNoticePayload(formData);

    if (payloadError || !payload) {
      return jsonError(payloadError || "Homepage notice details are invalid.", 400);
    }

    const { data: notice, error } = await supabase
      .from("homepage_notices")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return jsonError(friendlySupabaseError(error.message), 500);
    }

    revalidatePath("/");
    revalidatePath("/admin/homepage-notices");

    return NextResponse.json({ notice, message: "Homepage notice updated successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-notices] Update failed", error);
    return jsonError("Homepage notice could not be updated. Please try again.", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Homepage notice delete is not configured on the server.", 500);
    }

    const { error } = await supabase.from("homepage_notices").delete().eq("id", id);

    if (error) {
      return jsonError(friendlySupabaseError(error.message), 500);
    }

    revalidatePath("/");
    revalidatePath("/admin/homepage-notices");

    return NextResponse.json({ message: "Homepage notice deleted successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-notices] Delete failed", error);
    return jsonError("Homepage notice could not be deleted. Please try again.", 500);
  }
}
