import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InboxNotificationDeduplicator,
  dispatchBrowserNotification,
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  isNotificationSoundMuted,
  playNotificationChime,
  requestBrowserNotificationPermission,
  setNotificationSoundMuted,
} from "./inbox-notifications";

describe("InboxNotificationDeduplicator", () => {
  let deduplicator: InboxNotificationDeduplicator;

  beforeEach(() => {
    deduplicator = new InboxNotificationDeduplicator(5);
  });

  it("permits notification for a new message ID", () => {
    expect(deduplicator.shouldNotify("msg_123")).toBe(true);
    expect(deduplicator.hasNotified("msg_123")).toBe(true);
  });

  it("blocks duplicate notification for the same message ID", () => {
    expect(deduplicator.shouldNotify("msg_123")).toBe(true);
    expect(deduplicator.shouldNotify("msg_123")).toBe(false);
    expect(deduplicator.shouldNotify("  msg_123  ")).toBe(false);
  });

  it("returns false for null, undefined, or empty string", () => {
    expect(deduplicator.shouldNotify(null)).toBe(false);
    expect(deduplicator.shouldNotify(undefined)).toBe(false);
    expect(deduplicator.shouldNotify("")).toBe(false);
    expect(deduplicator.shouldNotify("   ")).toBe(false);
  });

  it("evicts oldest messages when exceeding capacity", () => {
    const smallDeduper = new InboxNotificationDeduplicator(3);
    expect(smallDeduper.shouldNotify("msg_1")).toBe(true);
    expect(smallDeduper.shouldNotify("msg_2")).toBe(true);
    expect(smallDeduper.shouldNotify("msg_3")).toBe(true);
    expect(smallDeduper.size()).toBe(3);

    // 4th message should evict msg_1
    expect(smallDeduper.shouldNotify("msg_4")).toBe(true);
    expect(smallDeduper.size()).toBe(3);
    expect(smallDeduper.hasNotified("msg_1")).toBe(false);
    expect(smallDeduper.hasNotified("msg_4")).toBe(true);

    // msg_1 can now notify again since it was evicted
    expect(smallDeduper.shouldNotify("msg_1")).toBe(true);
  });

  it("resets tracked IDs on reset()", () => {
    deduplicator.shouldNotify("msg_a");
    deduplicator.shouldNotify("msg_b");
    expect(deduplicator.size()).toBe(2);

    deduplicator.reset();
    expect(deduplicator.size()).toBe(0);
    expect(deduplicator.shouldNotify("msg_a")).toBe(true);
  });
});

describe("Audio Chime & Preferences", () => {
  const storage = new Map<string, string>();
  const mockLocalStorage = {
    getItem: vi.fn((k: string) => storage.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => storage.set(k, String(v))),
    removeItem: vi.fn((k: string) => storage.delete(k)),
    clear: vi.fn(() => storage.clear()),
  };

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {
      localStorage: mockLocalStorage,
      focus: vi.fn(),
    });
  });

  it("manages mute preference in localStorage", () => {
    expect(isNotificationSoundMuted()).toBe(false);

    setNotificationSoundMuted(true);
    expect(isNotificationSoundMuted()).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("dc_whatsapp_inbox_sound_muted", "true");

    setNotificationSoundMuted(false);
    expect(isNotificationSoundMuted()).toBe(false);
  });

  it("plays chime through AudioContext correctly", () => {
    const startFn = vi.fn();
    const stopFn = vi.fn();
    const connectFn = vi.fn();
    const setValueAtTimeFn = vi.fn();
    const exponentialRampToValueAtTimeFn = vi.fn();

    const mockOscillator = {
      type: "sine",
      frequency: {
        setValueAtTime: setValueAtTimeFn,
        exponentialRampToValueAtTime: exponentialRampToValueAtTimeFn,
      },
      connect: connectFn,
      start: startFn,
      stop: stopFn,
    };

    const mockGain = {
      gain: {
        setValueAtTime: setValueAtTimeFn,
        exponentialRampToValueAtTime: exponentialRampToValueAtTimeFn,
      },
      connect: connectFn,
    };

    const mockContext = {
      currentTime: 10,
      state: "running" as AudioContextState,
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      resume: vi.fn(async () => undefined),
    } as unknown as AudioContext;

    expect(() => playNotificationChime(mockContext)).not.toThrow();

    expect(mockContext.createOscillator).toHaveBeenCalled();
    expect(mockContext.createGain).toHaveBeenCalled();
    expect(startFn).toHaveBeenCalledWith(10);
    expect(stopFn).toHaveBeenCalledWith(10.35);
  });

  it("resumes suspended AudioContext on chime playback", () => {
    const resumeFn = vi.fn(async () => undefined);
    const mockContext = {
      currentTime: 0,
      state: "suspended" as AudioContextState,
      destination: {},
      createOscillator: vi.fn(() => ({
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      })),
      resume: resumeFn,
    } as unknown as AudioContext;

    playNotificationChime(mockContext);
    expect(resumeFn).toHaveBeenCalled();
  });
});

describe("Browser OS Notifications", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("checks browser notification support", () => {
    vi.stubGlobal("window", { Notification: {} });
    expect(isBrowserNotificationSupported()).toBe(true);

    vi.stubGlobal("window", {});
    expect(isBrowserNotificationSupported()).toBe(false);
  });

  it("returns null when permission is not granted", () => {
    const mockNotification = {
      permission: "default",
      requestPermission: vi.fn(async () => "default"),
    };
    vi.stubGlobal("window", { Notification: mockNotification });
    vi.stubGlobal("Notification", mockNotification);

    const result = dispatchBrowserNotification({
      title: "Test Alert",
      body: "Test message body",
    });

    expect(result).toBeNull();
  });

  it("dispatches notification and wires onClick when permission is granted", () => {
    const closeFn = vi.fn();
    const onClickCallback = vi.fn();
    const focusFn = vi.fn();

    class MockNotification {
      title: string;
      options: NotificationOptions;
      onclick: (() => void) | null = null;
      close = closeFn;

      static permission = "granted";
      static requestPermission = vi.fn(async () => "granted");

      constructor(title: string, options: NotificationOptions) {
        this.title = title;
        this.options = options;
      }
    }

    vi.stubGlobal("window", {
      focus: focusFn,
      Notification: MockNotification,
    });
    vi.stubGlobal("Notification", MockNotification);

    const notification = dispatchBrowserNotification({
      title: "New WhatsApp message",
      body: "Customer: Hello!",
      tag: "wa-123",
      onClick: onClickCallback,
    });

    expect(notification).not.toBeNull();
    expect((notification as unknown as MockNotification).title).toBe("New WhatsApp message");
    expect((notification as unknown as MockNotification).options.body).toBe("Customer: Hello!");
    expect((notification as unknown as MockNotification).options.tag).toBe("wa-123");

    // Trigger onClick
    (notification as unknown as MockNotification).onclick?.();
    expect(onClickCallback).toHaveBeenCalled();
    expect(closeFn).toHaveBeenCalled();
  });

  it("requests permission safely", async () => {
    const requestFn = vi.fn(async () => "granted" as NotificationPermission);
    const mockNotification = {
      permission: "default",
      requestPermission: requestFn,
    };
    vi.stubGlobal("window", { Notification: mockNotification });
    vi.stubGlobal("Notification", mockNotification);

    expect(getBrowserNotificationPermission()).toBe("default");
    const perm = await requestBrowserNotificationPermission();
    expect(perm).toBe("granted");
    expect(requestFn).toHaveBeenCalled();
  });
});
