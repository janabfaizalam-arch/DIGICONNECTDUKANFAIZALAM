export const pendingCustomerOAuthCookie = "digiconnect_pending_customer_oauth";

export const indianMobilePattern = /^[6-9]\d{9}$/;
export const indianPincodePattern = /^\d{6}$/;

export type CustomerOAuthProvider = "google" | "facebook";

export type PendingCustomerOAuthData = {
  mobile: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  provider: CustomerOAuthProvider;
};

export function normalizeIndianMobile(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

export function normalizeIndianPincode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isCustomerOAuthProvider(value: unknown): value is CustomerOAuthProvider {
  return value === "google" || value === "facebook";
}

export function isValidPendingCustomerOAuthData(value: unknown): value is PendingCustomerOAuthData {
  const data = value as Partial<PendingCustomerOAuthData> | null;

  return Boolean(
    data &&
      isCustomerOAuthProvider(data.provider) &&
      indianMobilePattern.test(String(data.mobile ?? "")) &&
      indianPincodePattern.test(String(data.pincode ?? "")) &&
      String(data.city ?? "").trim() &&
      String(data.district ?? "").trim() &&
      String(data.state ?? "").trim(),
  );
}

export function serializePendingCustomerOAuthData(data: PendingCustomerOAuthData) {
  return encodeURIComponent(JSON.stringify(data));
}

export function parsePendingCustomerOAuthData(value: string | undefined) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as unknown;
    return isValidPendingCustomerOAuthData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
