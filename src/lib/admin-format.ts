export function safeDate(value: string | number | Date | null | undefined, fallback = "-") {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function safeDateTime(value: string | number | Date | null | undefined, fallback = "-") {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function safeCurrency(value: unknown, fallback = "Rs 0") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return fallback;

  return `Rs ${Math.round(amount).toLocaleString("en-IN")}`;
}

export function safeNumber(value: unknown, fallback = "0") {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return fallback;

  return number.toLocaleString("en-IN");
}

export function safeDateValue(value: string | number | Date | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

