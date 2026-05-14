"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/providers/toast-provider";
import { applicationStatuses, statusLabels, type ApplicationStatus } from "@/lib/portal-data";

type StaffOption = {
  id: string;
  label: string;
};

export function AdminApplicationInlineUpdate({
  applicationId,
  status,
  assignedStaffId,
  staffOptions,
}: {
  applicationId: string;
  status: string;
  assignedStaffId?: string | null;
  staffOptions: StaffOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  function update(field: "status" | "assignedStaffId", value: string) {
    const formData = new FormData();
    formData.set(field, value);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/applications/${applicationId}`, {
          method: "PATCH",
          body: formData,
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message ?? "Update failed.");
        }

        success(result.message ?? "Updated.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Update failed.");
      }
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(value) => update("status", value)} disabled={isPending}>
          <SelectTrigger aria-label="Application status" className="h-9 min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {applicationStatuses.map((item) => (
              <SelectItem key={item} value={item}>{statusLabels[item as ApplicationStatus]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" /> : null}
      </div>
      <Select value={assignedStaffId || "none"} onValueChange={(value) => update("assignedStaffId", value)} disabled={isPending}>
        <SelectTrigger aria-label="Assigned staff" className="h-9 min-w-36">
          <SelectValue placeholder="Staff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No staff</SelectItem>
          {staffOptions.map((staff) => (
            <SelectItem key={staff.id} value={staff.id}>{staff.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
