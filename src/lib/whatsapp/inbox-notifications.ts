/**
 * Real-time notification helpers and deduplication manager for the WhatsApp Shared Inbox.
 *
 * Responsibilities:
 * 1. Deduplicate message notification triggers (audio chime and OS browser notifications)
 *    so multiple tabs, Realtime event fires, or polling cycles never double-alert the admin.
 * 2. Play subtle Web Audio chime without requiring external audio assets.
 * 3. Handle browser Notification permissions and dispatch OS notifications safely.
 * 4. Manage user audio mute/unmute preferences via localStorage.
 */

export const SOUND_MUTE_KEY = "dc_whatsapp_inbox_sound_muted";

/* ─────────────────────────────────────────────────────────────────────────
   1. Deduplication Cache
   ───────────────────────────────────────────────────────────────────────── */

export class InboxNotificationDeduplicator {
  private notifiedIds: Set<string>;
  private order: string[];
  private readonly maxCapacity: number;

  constructor(maxCapacity = 300) {
    this.notifiedIds = new Set();
    this.order = [];
    this.maxCapacity = maxCapacity;
  }

  /**
   * Returns true if this message ID has NOT been alerted yet.
   * If true, it records the ID so subsequent calls return false.
   */
  shouldNotify(messageId: string | null | undefined): boolean {
    if (!messageId) return false;

    const trimmed = messageId.trim();
    if (!trimmed) return false;

    if (this.notifiedIds.has(trimmed)) {
      return false;
    }

    this.notifiedIds.add(trimmed);
    this.order.push(trimmed);

    // Evict oldest if exceeding capacity
    if (this.order.length > this.maxCapacity) {
      const oldest = this.order.shift();
      if (oldest) {
        this.notifiedIds.delete(oldest);
      }
    }

    return true;
  }

  hasNotified(messageId: string | null | undefined): boolean {
    if (!messageId) return false;
    return this.notifiedIds.has(messageId.trim());
  }

  size(): number {
    return this.notifiedIds.size;
  }

  reset(): void {
    this.notifiedIds.clear();
    this.order = [];
  }
}

// Global singleton instance for the browser session
export const globalInboxDeduplicator = new InboxNotificationDeduplicator();

/* ─────────────────────────────────────────────────────────────────────────
   2. Audio Chime (Web Audio Synthesizer)
   ───────────────────────────────────────────────────────────────────────── */

let sharedAudioContext: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new AudioContextClass();
    }

    if (sharedAudioContext.state === "suspended") {
      void sharedAudioContext.resume().catch(() => {
        /* browser autoplay policy might require user gesture */
      });
    }

    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Plays a pleasant two-tone chime (D5 -> A5) using the Web Audio API.
 * Never throws, gracefully handles autoplay locks or unsupported browsers.
 */
export function playNotificationChime(customContext?: AudioContext | null): void {
  try {
    const ctx = customContext ?? getOrCreateAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {
        /* ignore */
      });
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const now = ctx.currentTime;

    // Harmonic two-tone: D5 (587.33 Hz) ramping to A5 (880 Hz)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    // Smooth attack and soft decay to prevent clicks
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    /* audio playback not permitted or unavailable */
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   3. Sound Preference (Mute/Unmute)
   ───────────────────────────────────────────────────────────────────────── */

export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SOUND_MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_MUTE_KEY, muted ? "true" : "false");
  } catch {
    /* ignore storage errors */
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   4. Browser OS Notifications
   ───────────────────────────────────────────────────────────────────────── */

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export type DispatchNotificationOptions = {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  onClick?: () => void;
};

/**
 * Dispatches an OS/browser notification if permission is granted.
 * Respects browser permission and mobile capabilities.
 */
export function dispatchBrowserNotification(options: DispatchNotificationOptions): Notification | null {
  if (!isBrowserNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      icon: options.icon ?? "/favicon.ico",
    });

    notification.onclick = () => {
      try {
        if (typeof window !== "undefined") {
          window.focus();
        }
      } catch {
        /* ignore */
      }
      options.onClick?.();
      notification.close();
    };

    return notification;
  } catch {
    return null;
  }
}
