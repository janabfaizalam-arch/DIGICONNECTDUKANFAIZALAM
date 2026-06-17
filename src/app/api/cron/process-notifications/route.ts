import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Simulated network transmission for SMS/WhatsApp API
async function mockSendWhatsAppNotification(recipient: string, message: string, retryCount: number) {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Simulate a transient failure on the first attempt of a 10% subset to showcase retries
  if (retryCount === 0 && recipient.endsWith("9") && Math.random() < 0.8) {
    throw new Error("Carrier gateway timeout (simulated transient error).");
  }

  // Simulate a permanent failure pattern for validation
  if (recipient === "+910000000000") {
    throw new Error("Invalid phone number format: recipient rejected by gateway.");
  }

  return {
    success: true,
    messageId: `wa_msg_${Math.random().toString(36).substring(2, 11)}`,
  };
}

export async function POST() {
  return await processQueue();
}

export async function GET() {
  return await processQueue();
}

async function processQueue() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database service unavailable." },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch pending/retriable notifications in batch (oldest first)
    const { data: queueItems, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .or("status.eq.pending,and(status.eq.failed,retry_count.lt.max_retries)")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("[process-notifications] Failed to fetch queue:", fetchError);
      return NextResponse.json({ error: "Failed to fetch queue items." }, { status: 500 });
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: "Queue is empty." });
    }

    const results = [];

    for (const item of queueItems) {
      // Set status to processing immediately to avoid concurrent runs grabbing it
      await supabase
        .from("notification_queue")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", item.id);

      const nextRetryCount = item.retry_count + 1;
      const messageText = item.payload?.message || `Notification update from DigiConnect Dukan`;

      try {
        // Attempt delivery
        const delivery = await mockSendWhatsAppNotification(
          item.recipient,
          messageText,
          item.retry_count
        );

        // Update database as sent
        await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            retry_count: nextRetryCount,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          recipient: item.recipient,
          status: "sent",
          messageId: delivery.messageId,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const finalStatus = nextRetryCount >= item.max_retries ? "failed" : "failed"; // stays failed but retry count stops it later

        await supabase
          .from("notification_queue")
          .update({
            status: finalStatus,
            retry_count: nextRetryCount,
            error_message: errMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          recipient: item.recipient,
          status: finalStatus,
          error: errMsg,
          retries: nextRetryCount,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: queueItems.length,
      results,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[process-notifications] Global handler error:", error);
    return NextResponse.json(
      { error: "Internal server error.", details: errMsg },
      { status: 500 }
    );
  }
}
