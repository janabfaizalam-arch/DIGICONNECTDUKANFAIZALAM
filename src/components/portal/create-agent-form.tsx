"use client";

import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserPlus } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateAgentForm({ defaultAgentCode }: { defaultAgentCode: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/agents", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; agentId?: string };

        if (!response.ok || !result.agentId) {
          throw new Error(result.message ?? "Agent could not be created.");
        }

        showToast(result.message ?? "Agent created.");
        router.push("/admin/agents");
        router.refresh();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Agent could not be created.", "error");
      }
    });
  }

  return (
    <Card className="p-4 md:p-6">
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input name="fullName" placeholder="Full Name" required />
          <Input name="mobile" placeholder="Mobile Number" inputMode="numeric" required />
          <Input name="email" placeholder="Email" type="email" required />
          <Input name="agentCode" placeholder="Agent Code" defaultValue={defaultAgentCode} required />
          <Input name="password" placeholder="Password" type="password" required />
          <Select name="commissionType" defaultValue="fixed">
            <SelectTrigger aria-label="Commission type">
              <SelectValue placeholder="Commission Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
          <Input name="commissionValue" placeholder="Commission Value" type="number" min="0" step="0.01" required />
          <Select name="isActive" defaultValue="true">
            <SelectTrigger aria-label="Agent status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isPending} className="w-full md:w-fit">
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create Agent
        </Button>
      </form>
    </Card>
  );
}
