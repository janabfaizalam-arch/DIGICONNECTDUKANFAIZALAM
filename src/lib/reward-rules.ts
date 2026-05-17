export const SIGNUP_BONUS_AMOUNT = 500;
export const REFERRER_SIGNUP_BONUS_AMOUNT = 100;
export const REFERRER_FIRST_SERVICE_BONUS_AMOUNT = 100;
export const FIRST_SERVICE_CASHBACK_PERCENT = 100;
export const REPEAT_CASHBACK_PERCENT = 20;
export const MAX_WALLET_REDEEM_PERCENT = 50;

export function calculateMaxWalletRedeem(serviceAmount: number, walletBalance: number) {
  const amount = Math.max(0, Math.round(Number(serviceAmount ?? 0)));
  const balance = Math.max(0, Math.round(Number(walletBalance ?? 0)));

  return Math.min(balance, Math.floor(amount * (MAX_WALLET_REDEEM_PERCENT / 100)));
}

export function calculateWalletRedeemBreakdown({
  serviceAmount,
  walletBalance,
  requestedRedeem,
}: {
  serviceAmount: number;
  walletBalance: number;
  requestedRedeem: number;
}) {
  const amount = Math.max(0, Math.round(Number(serviceAmount ?? 0)));
  const balance = Math.max(0, Math.round(Number(walletBalance ?? 0)));
  const requested = Math.max(0, Math.round(Number(requestedRedeem ?? 0)));
  const maxRedeem = Math.min(balance, Math.floor(amount * (MAX_WALLET_REDEEM_PERCENT / 100)));
  const walletRedeem = amount === 0 ? 0 : Math.min(requested, maxRedeem);
  const freshPayable = Math.max(0, amount - walletRedeem);
  const minimumFreshPayable = Math.ceil(amount * ((100 - MAX_WALLET_REDEEM_PERCENT) / 100));

  if (amount > 0 && freshPayable < minimumFreshPayable) {
    throw new Error("Wallet redeem cannot exceed 50% of service amount");
  }

  return {
    serviceAmount: amount,
    walletBalance: balance,
    requestedRedeem: requested,
    maxRedeem,
    walletRedeem,
    freshPayable,
    minimumFreshPayable,
    cashbackEligibleAmount: freshPayable,
    wasClamped: requested > maxRedeem,
  };
}

export function calculateCashbackForFreshPayment(freshPaidAmount: number, isFirstService: boolean) {
  const amount = Math.max(0, Number(freshPaidAmount ?? 0));
  const percent = isFirstService ? FIRST_SERVICE_CASHBACK_PERCENT : REPEAT_CASHBACK_PERCENT;

  return Math.round(amount * (percent / 100));
}
