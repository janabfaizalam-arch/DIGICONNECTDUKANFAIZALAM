/**
 * Only a path on this site. "/\\evil.com" and "//evil.com" both resolve to
 * another host in a browser, so the value is resolved against a placeholder
 * origin and anything that leaves it is dropped.
 */
export function getSafeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  try {
    const base = "https://callback.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
