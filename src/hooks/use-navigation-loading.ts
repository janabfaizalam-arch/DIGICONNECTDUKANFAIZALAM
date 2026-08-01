/** Pure helpers for navigation loading timing — unit-tested without DOM. */

export const NAV_LOADER_SHOW_DELAY_MS = 150;
export const NAV_LOADER_MIN_VISIBLE_MS = 250;
export const NAV_LOADER_MAX_MS = 8_000;

export function isInternalAppNavigation(options: {
  href: string | null | undefined;
  currentOrigin: string;
  currentPathWithSearch: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  button?: number;
  target?: string | null;
  download?: boolean;
}): boolean {
  if (!options.href) return false;
  if (options.button != null && options.button !== 0) return false;
  if (options.metaKey || options.ctrlKey || options.shiftKey || options.altKey) return false;
  if (options.download) return false;
  const target = (options.target || "").toLowerCase();
  if (target && target !== "_self") return false;

  let url: URL;
  try {
    url = new URL(options.href, options.currentOrigin);
  } catch {
    return false;
  }

  if (url.origin !== options.currentOrigin) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const next = `${url.pathname}${url.search}`;
  if (next === options.currentPathWithSearch) return false;

  return true;
}

export function computeHideDelayMs(options: {
  shownAt: number | null;
  now: number;
  minVisibleMs?: number;
}): number {
  const minVisible = options.minVisibleMs ?? NAV_LOADER_MIN_VISIBLE_MS;
  if (options.shownAt == null) return 0;
  const visibleFor = options.now - options.shownAt;
  return Math.max(0, minVisible - visibleFor);
}
