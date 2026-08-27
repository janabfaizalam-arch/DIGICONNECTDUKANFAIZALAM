import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isCustomerRole } from "@/lib/auth";
import { ensureReferralCodeForUser } from "@/lib/referrals";

/**
 * Issue this customer's referral code, on demand.
 *
 * The dashboard used to say "your referral code is on its way — refresh in a
 * moment" whenever the code came back empty. On a live account it never
 * arrived, and the message had no way of ever becoming true: nothing retried,
 * and the underlying failure was swallowed at the call site. A customer could
 * refresh forever.
 *
 * This gives the wallet screen something to actually call. It is the same
 * `ensure_referral_code_for_user` routine the server-side loaders use — which
 * returns the existing code when there is one, so pressing the button twice is
 * harmless — and it reports a real error instead of a promise when it fails.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  }

  const role = await getCurrentUserRole(user);
  if (!isCustomerRole(role)) {
    return NextResponse.json({ ok: false, error: "Not available for this account." }, { status: 403 });
  }

  try {
    const code = await ensureReferralCodeForUser(user.id);
    if (!code) {
      // The routine answered without raising but gave nothing back, which
      // means the profile row it writes to is missing.
      console.error("REFERRAL_CODE_EMPTY", { userId: user.id });
      return NextResponse.json(
        { ok: false, error: "We could not create your code. Please contact support." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, code });
  } catch (error) {
    console.error("REFERRAL_CODE_FAILED", {
      userId: user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: "We could not create your code right now. Please try again shortly." },
      { status: 502 },
    );
  }
}
