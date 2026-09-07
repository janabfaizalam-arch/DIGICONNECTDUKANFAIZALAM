import { FactCheckWorkbench } from "@/components/content-engine/fact-check-workbench";

export const dynamic = "force-dynamic";

/** Stage 04 — the stage that is allowed to stop everything. */
export default function Page() {
  return <FactCheckWorkbench />;
}
