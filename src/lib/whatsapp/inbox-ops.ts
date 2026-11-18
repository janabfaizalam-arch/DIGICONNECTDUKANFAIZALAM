import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkServiceWindow, type ServiceWindowStatus } from "@/lib/whatsapp/inbox-send";

export type InboxFilter = "all" | "unread" | "open" | "pending" | "resolved" | "archived" | "mine";

export type InboxConversationSummary = {
  id: string;
  customerId: string | null;
  waId: string;
  customerName: string;
  phoneNumber: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "open" | "pending" | "resolved" | "archived";
  assignedTo: string | null;
  assignedStaffName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InboxMessageItem = {
  id: string;
  conversationId: string;
  metaMessageId: string | null;
  direction: "inbound" | "outbound";
  messageType: "text" | "image" | "document" | "audio" | "video" | "interactive" | "template" | "unknown";
  messageBody: string;
  mediaId: string | null;
  mediaMimeType: string | null;
  mediaStoragePath: string | null;
  messageStatus: "received" | "sent" | "delivered" | "read" | "failed";
  errorDetails: string | null;
  senderType: "customer" | "staff" | "system" | "bot";
  senderId: string | null;
  timestamp: string;
  rawMetadata: Record<string, unknown> | null;
};

export async function listInboxConversations(options: {
  filter?: InboxFilter | string | null;
  q?: string | null;
  userId?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{
  ok: true;
  conversations: InboxConversationSummary[];
  total: number;
  totalUnread: number;
  page: number;
  pageSize: number;
} | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable", status: 503 };

  const page = Math.max(1, Number(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(5, Number(options.pageSize ?? 30)));
  const filter = (options.filter || "all") as InboxFilter;
  const q = options.q?.trim() || "";

  try {
    let query = supabase.from("whatsapp_conversations").select("*", { count: "exact" });

    // Status / tab filter
    switch (filter) {
      case "unread":
        query = query.gt("unread_count", 0);
        break;
      case "open":
        query = query.eq("status", "open");
        break;
      case "pending":
        query = query.eq("status", "pending");
        break;
      case "resolved":
        query = query.eq("status", "resolved");
        break;
      case "archived":
        query = query.eq("status", "archived");
        break;
      case "mine":
        if (options.userId) {
          query = query.eq("assigned_to", options.userId);
        }
        break;
      case "all":
      default:
        // By default show all non-archived conversations
        query = query.neq("status", "archived");
        break;
    }

    // Search query
    if (q) {
      const escaped = q.replace(/[%_]/g, "");
      query = query.or(
        `customer_name.ilike.%${escaped}%,phone_number.ilike.%${escaped}%,wa_id.ilike.%${escaped}%,last_message.ilike.%${escaped}%`,
      );
    }

    // Pagination & sorting
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.order("last_message_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error("[inbox-ops] listInboxConversations error", error);
      return { ok: false, error: "Failed to load conversations", status: 500 };
    }

    // Fetch aggregate unread count
    const { count: unreadCount } = await supabase
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .gt("unread_count", 0)
      .neq("status", "archived");

    const rows = (data ?? []) as Record<string, unknown>[];
    const conversations: InboxConversationSummary[] = rows.map((r) => ({
      id: String(r.id),
      customerId: r.customer_id ? String(r.customer_id) : null,
      waId: String(r.wa_id ?? ""),
      customerName: String(r.customer_name ?? "WhatsApp Customer"),
      phoneNumber: String(r.phone_number ?? ""),
      lastMessage: String(r.last_message ?? ""),
      lastMessageAt: String(r.last_message_at ?? r.created_at ?? ""),
      unreadCount: Number(r.unread_count ?? 0),
      status: (r.status as InboxConversationSummary["status"]) || "open",
      assignedTo: r.assigned_to ? String(r.assigned_to) : null,
      createdAt: String(r.created_at ?? ""),
      updatedAt: String(r.updated_at ?? ""),
    }));

    return {
      ok: true,
      conversations,
      total: count ?? conversations.length,
      totalUnread: unreadCount ?? 0,
      page,
      pageSize,
    };
  } catch (err) {
    console.error("[inbox-ops] Unexpected error", err);
    return { ok: false, error: "Failed to load conversations", status: 500 };
  }
}

export type InboxConversationDetail = InboxConversationSummary & {
  metadata: Record<string, unknown>;
  serviceWindow?: ServiceWindowStatus;
  customer?: {
    id: string;
    fullName: string;
    mobile: string;
    email?: string;
    city?: string;
    address?: string;
    notes?: string;
  } | null;
};

export async function getInboxConversation(conversationId: string): Promise<{
  ok: true;
  conversation: InboxConversationDetail;
} | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable", status: 503 };

  const { data: conv, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conv) {
    return { ok: false, error: "Conversation not found", status: 404 };
  }

  let customerData: {
    id: string;
    fullName: string;
    mobile: string;
    email?: string;
    city?: string;
    address?: string;
    notes?: string;
  } | null = null;

  if (conv.customer_id) {
    const { data: cust } = await supabase
      .from("customers")
      .select("id, full_name, mobile, email, city, address, notes")
      .eq("id", conv.customer_id)
      .maybeSingle();

    if (cust) {
      customerData = {
        id: String(cust.id),
        fullName: String(cust.full_name ?? ""),
        mobile: String(cust.mobile ?? ""),
        email: cust.email ? String(cust.email) : undefined,
        city: cust.city ? String(cust.city) : undefined,
        address: cust.address ? String(cust.address) : undefined,
        notes: cust.notes ? String(cust.notes) : undefined,
      };
    }
  }

  const serviceWindow = await checkServiceWindow(conversationId, supabase);

  return {
    ok: true,
    conversation: {
      id: String(conv.id),
      customerId: conv.customer_id ? String(conv.customer_id) : null,
      waId: String(conv.wa_id),
      customerName: String(conv.customer_name ?? "WhatsApp Customer"),
      phoneNumber: String(conv.phone_number),
      lastMessage: String(conv.last_message ?? ""),
      lastMessageAt: String(conv.last_message_at ?? conv.created_at),
      unreadCount: Number(conv.unread_count ?? 0),
      status: (conv.status as InboxConversationSummary["status"]) || "open",
      assignedTo: conv.assigned_to ? String(conv.assigned_to) : null,
      metadata: (conv.metadata && typeof conv.metadata === "object" ? conv.metadata : {}) as Record<string, unknown>,
      customer: customerData,
      serviceWindow,
      createdAt: String(conv.created_at),
      updatedAt: String(conv.updated_at),
    },
  };
}

export async function getInboxMessages(
  conversationId: string,
  options?: { limit?: number; markRead?: boolean },
): Promise<{
  ok: true;
  messages: InboxMessageItem[];
} | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable", status: 503 };

  const limit = Math.min(100, Math.max(10, Number(options?.limit ?? 50)));

  // If markRead is true (default), reset unread_count on conversation
  if (options?.markRead !== false) {
    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[inbox-ops] getInboxMessages error", error);
    return { ok: false, error: "Failed to load messages", status: 500 };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const messages: InboxMessageItem[] = rows.map((r) => ({
    id: String(r.id),
    conversationId: String(r.conversation_id),
    metaMessageId: r.meta_message_id ? String(r.meta_message_id) : null,
    direction: (r.direction as InboxMessageItem["direction"]) || "outbound",
    messageType: (r.message_type as InboxMessageItem["messageType"]) || "text",
    messageBody: String(r.message_body ?? r.error_message ?? ""),
    mediaId: r.media_id ? String(r.media_id) : null,
    mediaMimeType: r.media_mime_type ? String(r.media_mime_type) : null,
    mediaStoragePath: r.media_storage_path ? String(r.media_storage_path) : null,
    messageStatus: (r.message_status as InboxMessageItem["messageStatus"]) || (r.status as InboxMessageItem["messageStatus"]) || "sent",
    errorDetails: r.error_details ? String(r.error_details) : r.failure_summary ? String(r.failure_summary) : null,
    senderType: (r.sender_type as InboxMessageItem["senderType"]) || "system",
    senderId: r.sender_id ? String(r.sender_id) : null,
    timestamp: String(r.timestamp ?? r.created_at),
    rawMetadata: (r.raw_metadata || r.safe_metadata || null) as Record<string, unknown> | null,
  }));

  return { ok: true, messages };
}

export async function updateInboxConversation(
  conversationId: string,
  patch: {
    status?: "open" | "pending" | "resolved" | "archived";
    assignedTo?: string | null;
    customerId?: string | null;
    internalNote?: string;
  },
  actorId?: string,
): Promise<{ ok: true; conversation: InboxConversationSummary } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable", status: 503 };

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = { updated_at: now };

  if (patch.status) updatePayload.status = patch.status;
  if (patch.assignedTo !== undefined) updatePayload.assigned_to = patch.assignedTo;
  if (patch.customerId !== undefined) updatePayload.customer_id = patch.customerId;

  if (patch.internalNote) {
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("metadata")
      .eq("id", conversationId)
      .maybeSingle();

    const currentMeta = (conv?.metadata && typeof conv.metadata === "object" ? conv.metadata : {}) as Record<string, unknown>;
    const notesList = Array.isArray(currentMeta.internal_notes) ? currentMeta.internal_notes : [];
    notesList.push({
      text: patch.internalNote.trim().slice(0, 1000),
      created_at: now,
      author_id: actorId ?? null,
    });
    updatePayload.metadata = { ...currentMeta, internal_notes: notesList };
  }

  const { data: updated, error } = await supabase
    .from("whatsapp_conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .select("*")
    .single();

  if (error || !updated) {
    return { ok: false, error: "Failed to update conversation", status: 500 };
  }

  return {
    ok: true,
    conversation: {
      id: String(updated.id),
      customerId: updated.customer_id ? String(updated.customer_id) : null,
      waId: String(updated.wa_id),
      customerName: String(updated.customer_name ?? "WhatsApp Customer"),
      phoneNumber: String(updated.phone_number),
      lastMessage: String(updated.last_message ?? ""),
      lastMessageAt: String(updated.last_message_at ?? updated.created_at),
      unreadCount: Number(updated.unread_count ?? 0),
      status: updated.status as InboxConversationSummary["status"],
      assignedTo: updated.assigned_to ? String(updated.assigned_to) : null,
      createdAt: String(updated.created_at),
      updatedAt: String(updated.updated_at),
    },
  };
}

/**
 * Returns lightweight unread metrics for the shared inbox navigation badge.
 */
export async function getInboxUnreadCount(): Promise<
  | {
      ok: true;
      unreadConversations: number;
      totalUnreadMessages: number;
    }
  | { ok: false; error: string; status: number }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable", status: 503 };

  try {
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("unread_count")
      .gt("unread_count", 0)
      .neq("status", "archived");

    if (error) {
      console.error("[inbox-ops] getInboxUnreadCount error", error);
      return { ok: false, error: "Failed to fetch unread count", status: 500 };
    }

    const rows = (data ?? []) as { unread_count: number | null }[];
    const unreadConversations = rows.length;
    const totalUnreadMessages = rows.reduce((acc, r) => acc + (r.unread_count ?? 0), 0);

    return {
      ok: true,
      unreadConversations,
      totalUnreadMessages,
    };
  } catch (err) {
    console.error("[inbox-ops] Unexpected error in getInboxUnreadCount", err);
    return { ok: false, error: "Internal server error", status: 500 };
  }
}

