/**
 * Client-side Razorpay configuration resolver.
 *
 * Sourced dynamically from the server endpoint (/api/razorpay/config) or
 * from the order creation response payload, avoiding any hard build-time
 * dependency on NEXT_PUBLIC_RAZORPAY_KEY_ID in client bundles.
 */

let cachedKeyId: string | null = null;

export async function fetchRazorpayKeyId(): Promise<string> {
  if (cachedKeyId) {
    return cachedKeyId;
  }

  const res = await fetch("/api/razorpay/config", {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Online payment is temporarily unavailable. Razorpay is not configured.");
  }

  const data = (await res.json().catch(() => null)) as { ok?: boolean; keyId?: string } | null;
  if (!data?.keyId) {
    throw new Error("Razorpay public key was not returned by server.");
  }

  cachedKeyId = data.keyId;
  return data.keyId;
}

export async function getCheckoutRazorpayKey(orderKeyId?: string | null): Promise<string> {
  const trimmed = orderKeyId?.trim();
  if (trimmed) {
    return trimmed;
  }
  return fetchRazorpayKeyId();
}

export function resetCachedRazorpayKeyId(): void {
  cachedKeyId = null;
}
