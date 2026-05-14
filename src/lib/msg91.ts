const MSG91_VERIFY_ACCESS_TOKEN_URL = "https://control.msg91.com/api/v5/widget/verifyAccessToken";

type Msg91VerificationResponse = {
  type?: string;
  message?: string;
  status?: string;
  mobile?: string;
  phone?: string;
  identifier?: string;
  email?: string;
  user?: {
    mobile?: string;
    phone?: string;
    identifier?: string;
    email?: string;
    name?: string;
    full_name?: string;
  };
  data?: {
    mobile?: string;
    phone?: string;
    identifier?: string;
    email?: string;
    name?: string;
    full_name?: string;
  };
};

export type Msg91VerifiedUser = {
  mobile: string;
  email: string;
  fullName: string;
  raw: Msg91VerificationResponse;
};

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeIndianMobile(value: string | null | undefined) {
  const digits = onlyDigits(value);
  const withoutCountryCode = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;

  return /^\d{10}$/.test(withoutCountryCode) ? withoutCountryCode : "";
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

function responseLooksVerified(result: Msg91VerificationResponse) {
  const haystack = `${result.type ?? ""} ${result.status ?? ""} ${result.message ?? ""}`.toLowerCase();

  return haystack.includes("success") || haystack.includes("verified");
}

export async function verifyMsg91AccessToken(accessToken: string, expectedMobile: string): Promise<Msg91VerifiedUser> {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const mobile = normalizeIndianMobile(expectedMobile);

  if (!authKey) {
    throw new Error("MSG91 auth key is not configured.");
  }

  if (!accessToken.trim()) {
    throw new Error("OTP verification token is missing.");
  }

  if (!mobile) {
    throw new Error("A valid 10 digit mobile number is required.");
  }

  const body = new URLSearchParams();
  body.set("authkey", authKey);
  body.set("access-token", accessToken);

  const response = await fetch(MSG91_VERIFY_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const result = (await response.json().catch(() => ({}))) as Msg91VerificationResponse;

  if (!response.ok || !responseLooksVerified(result)) {
    throw new Error(result.message || "OTP token could not be verified.");
  }

  const verifiedMobile = normalizeIndianMobile(
    firstText(
      result.mobile,
      result.phone,
      result.identifier,
      result.user?.mobile,
      result.user?.phone,
      result.user?.identifier,
      result.data?.mobile,
      result.data?.phone,
      result.data?.identifier,
    ),
  );

  if (verifiedMobile && verifiedMobile !== mobile) {
    throw new Error("Verified mobile number does not match this login request.");
  }

  return {
    mobile,
    email: firstText(result.email, result.user?.email, result.data?.email),
    fullName: firstText(result.user?.full_name, result.user?.name, result.data?.full_name, result.data?.name),
    raw: result,
  };
}
