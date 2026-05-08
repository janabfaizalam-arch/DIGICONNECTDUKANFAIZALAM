import Razorpay from "razorpay";

let razorpayClient: Razorpay | null = null;

export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
}

export function getRazorpayKeySecret() {
  return process.env.RAZORPAY_KEY_SECRET || "";
}

export function getRazorpayClient() {
  const key_id = getRazorpayKeyId();
  const key_secret = getRazorpayKeySecret();

  if (!key_id || !key_secret) {
    return null;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id,
      key_secret,
    });
  }

  return razorpayClient;
}
