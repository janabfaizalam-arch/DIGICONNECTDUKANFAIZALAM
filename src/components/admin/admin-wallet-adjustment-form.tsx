"use client";

import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CustomerOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export function AdminWalletAdjustmentForm({ customers }: { customers: CustomerOption[] }) {
  const [isPending, startTransition] = useTransition();
  const { success, error } = useToast();
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: String(formData.get("userId") ?? ""),
            amount: Number(formData.get("amount") ?? 0),
            transactionType: String(formData.get("transactionType") ?? "admin_bonus"),
            expiryDays: Number(formData.get("expiryDays") ?? 90),
            note: String(formData.get("note") ?? ""),
          }),
        });
        const result = (await response.json()) as { message: string };

        if (!response.ok) {
          throw new Error(result.message);
        }

        success(result.message);
        router.refresh();
      } catch (caught) {
        error(caught instanceof Error ? caught.message : "Wallet update failed.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Select name="userId" required>
        <SelectTrigger aria-label="Customer">
          <SelectValue placeholder="Select customer" />
        </SelectTrigger>
        <SelectContent>
          {customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              {customer.full_name || customer.email || customer.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select name="transactionType" defaultValue="admin_bonus">
        <SelectTrigger aria-label="Transaction type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin_bonus">Admin Bonus</SelectItem>
          <SelectItem value="refund_adjustment">Refund Adjustment</SelectItem>
        </SelectContent>
      </Select>
      <Input name="amount" type="number" step="1" placeholder="Amount (+ add, - remove)" required />
      <Input name="expiryDays" type="number" min="1" defaultValue="90" placeholder="Expiry days" />
      <Input name="note" placeholder="Admin note" />
      <Button type="submit" disabled={isPending}>
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Update DigiWallet
      </Button>
    </form>
  );
}
