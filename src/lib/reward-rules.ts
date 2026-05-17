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

export function calculateCashbackForFreshPayment(freshPaidAmount: number, isFirstService: boolean) {
  const amount = Math.max(0, Number(freshPaidAmount ?? 0));
  const percent = isFirstService ? FIRST_SERVICE_CASHBACK_PERCENT : REPEAT_CASHBACK_PERCENT;

  return Math.round(amount * (percent / 100));
}
