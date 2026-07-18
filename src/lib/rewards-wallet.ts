import { ensureWallet } from "@/lib/wallet";
import { creditSignupBonus, postWalletTransaction } from "@/lib/wallet-ledger";

export async function createWalletIfMissing(userId: string) {
  return ensureWallet(userId);
}

export { creditSignupBonus, postWalletTransaction, ensureWallet };
