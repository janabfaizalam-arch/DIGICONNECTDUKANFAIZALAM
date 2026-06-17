// src/lib/eventBus.ts

import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Emit an event into the universal event registry.
 * The event is stored in the `events` table and a corresponding job is enqueued in `event_queue`.
 */
export async function emitEvent(eventType: string, payload: Record<string, unknown> | unknown): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[eventBus] Supabase not initialized');
    return;
  }

  // Insert the event record
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .insert({ type: eventType, payload })
    .select('id')
    .single();

  if (eventError) {
    console.error('[eventBus] Failed to insert event', eventError);
    return;
  }

  const eventId = eventData?.id;

  // Enqueue a job for background processing
  const { error: queueError } = await supabase.from('event_queue').insert({
    event_id: eventId,
    status: 'pending',
    retry_count: 0,
  });

  if (queueError) {
    console.error('[eventBus] Failed to enqueue event', queueError);
  }
}
