import { Suspense } from "react";

import { DraftsWorkbench } from "@/components/content-engine/drafts-workbench";
import { Spinner } from "@/components/content-engine/primitives";

export const dynamic = "force-dynamic";

/** Stage 03 — the master content behind every platform version. */
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <DraftsWorkbench />
    </Suspense>
  );
}
