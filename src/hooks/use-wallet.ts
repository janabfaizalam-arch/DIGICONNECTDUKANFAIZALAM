"use client";

import { useEffect, useMemo, useState } from "react";

import { getWalletMaxUsable } from "@/lib/wallet";

type WalletApiResponse = {
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
        const response = await fetch("/api/wallet", { cache: "no-store" });

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
  }, []);

  const balance = Number(data?.wallet?.balance_points ?? data?.wallet?.balance ?? 0);
  const maxUsable = useMemo(() => getWalletMaxUsable(orderAmount, balance), [balance, orderAmount]);

  return {
    wallet: data?.wallet ?? null,
    transactions: data?.transactions ?? [],
    expiringSoonAmount: Number(data?.expiringSoonAmount ?? 0),
    balance,
    maxUsable,
    isLoading,
  };
}
