/** Normalize Indian mobile to digits-only 10-digit local form and E.164. */

export function normalizeIndianPhone(input: string): { ok: true; local: string; e164: string; display: string } | { ok: false; error: string } {
  const digits = String(input ?? "").replace(/\D/g, "");

  let local = digits;
  if (local.startsWith("91") && local.length === 12) {
    local = local.slice(2);
  }
  if (local.length === 11 && local.startsWith("0")) {
    local = local.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(local)) {
    return { ok: false, error: "Valid Indian 10-digit WhatsApp number required." };
  }

  return {
    ok: true,
    local,
    e164: `+91${local}`,
    display: `+91 ${local}`,
  };
}

export function maskPhone(e164OrLocal: string): string {
  const digits = e164OrLocal.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.slice(-10);
  if (local.length !== 10) return "+91 XXXXXX****";
  return `+91 ${local.slice(0, 2)}XXXXXX${local.slice(-2)}`;
}

export function customerInternalEmail(localPhone: string): string {
  return `${localPhone}@customer.rnos.internal`;
}

export function agencyInternalEmail(username: string): string {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${safe}@agency.rnos.internal`;
}
