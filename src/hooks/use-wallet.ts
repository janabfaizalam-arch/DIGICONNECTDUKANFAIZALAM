"use client";

import { useEffect, useMemo, useState } from "react";

import { getWalletMaxUsable } from "@/lib/wallet";

type WalletApiResponse = {
  balance?: number;
  lifetime_earned?: number;
  lifetime_redeemed?: number;
  maxRedeemPreview?: {
    serviceAmount: number;
    maxRedeem: number;
    freshPayableAmount: number;
  } | null;
  wallet: {
    balance?: number;
    balance_points?: number;
    total_cashback_earned: number;
    total_cashback_used: number;
    nearest_expiry_at: string | null;
  } | null;
  transactions: {
    id: string;
    type?: string;
    amount: number;
    remaining_amount: number;
    description?: string | null;
    status: string;
    expires_at: string | null;
    created_at: string;
  }[];
  expiringSoonAmount: number;
};

export function useWallet(orderAmount = 0) {
  const [data, setData] = useState<WalletApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadWallet() {
      setIsLoading(true);

      try {
        const params = orderAmount > 0 ? `?serviceAmount=${encodeURIComponent(orderAmount)}` : "";
        const response = await fetch(`/api/customer/wallet${params}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Wallet unavailable");
        }

        const nextData = (await response.json()) as WalletApiResponse;

        if (active) {
          setData(nextData);
        }
      } catch {
        if (active) {
          setData(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      active = false;
    };
  }, [orderAmount]);

  const balance = Number(data?.balance ?? data?.wallet?.balance_points ?? data?.wallet?.balance ?? 0);
  const maxUsable = useMemo(
    () => Number(data?.maxRedeemPreview?.maxRedeem ?? getWalletMaxUsable(orderAmount, balance)),
    [balance, data?.maxRedeemPreview?.maxRedeem, orderAmount],
  );

  return {
    wallet: data?.wallet ?? null,
    transactions: data?.transactions ?? [],
    expiringSoonAmount: Number(data?.expiringSoonAmount ?? 0),
    balance,
    maxUsable,
    isLoading,
  };
}
