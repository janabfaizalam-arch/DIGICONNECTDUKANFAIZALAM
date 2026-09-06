import { Suspense } from "react";

import { ApprovalWorkbench } from "@/components/content-engine/approval-workbench";
import { Spinner } from "@/components/content-engine/primitives";

export const dynamic = "force-dynamic";

/** The gate. Nothing reaches the public without passing through this screen. */
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ApprovalWorkbench />
    </Suspense>
  );
}
