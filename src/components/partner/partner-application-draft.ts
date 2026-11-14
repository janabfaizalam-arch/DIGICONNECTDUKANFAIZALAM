/**
 * Keeping a half-filled partner application.
 *
 * The form is filled standing in a shop on a phone, and a dropped connection,
 * an accidental back swipe or a call coming in used to cost the whole thing.
 * The draft lives in this browser only: it never reaches us, and it is cleared
 * the moment the application is actually submitted, so a shop's shared phone
 * is not left holding somebody's name and number.
 *
 * Every read and write is wrapped, because storage throws in a private window
 * and comes back empty when site data is cleared. A draft that cannot be saved
 * is not an error the applicant should ever hear about.
 */

const KEY = "digipartner_application_draft";

/** Older than this and it is almost certainly a different person at the counter. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Stored<T> = { savedAt: number; form: T };

export function saveDraft<T extends object>(form: T): void {
  try {
    const payload: Stored<T> = { savedAt: Date.now(), form };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* Private window, or storage is full. The form still works. */
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Nothing to do — the draft expires on its own. */
  }
}

/**
 * The saved draft, or null.
 *
 * Only the keys the caller already has are copied back. A stored field that is
 * no longer part of the form is dropped rather than spread into state, so an
 * old draft cannot resurrect a question we stopped asking.
 */
export function loadDraft<T extends object>(shape: T): T | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Stored<Record<string, unknown>>>;
    const savedAt = Number(parsed?.savedAt ?? 0);
    const form = parsed?.form;

    if (!form || typeof form !== "object") return null;
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      clearDraft();
      return null;
    }

    const restored = { ...shape };
    let changed = false;

    for (const key of Object.keys(shape) as (keyof T)[]) {
      const value = (form as Record<string, unknown>)[key as string];
      if (typeof value === "string" && value.length > 0) {
        restored[key] = value as T[keyof T];
        changed = true;
      }
    }

    return changed ? restored : null;
  } catch {
    return null;
  }
}
