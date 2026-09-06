import { Suspense } from "react";

import { AnglesWorkbench } from "@/components/content-engine/angles-workbench";
import { Spinner } from "@/components/content-engine/primitives";

export const dynamic = "force-dynamic";

/** Stage 02 — five hooks for one topic, and the one worth using. */
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <AnglesWorkbench />
    </Suspense>
  );
}
