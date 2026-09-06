import { SettingsWorkbench } from "@/components/content-engine/settings-workbench";

export const dynamic = "force-dynamic";

/** What the engine may do on its own, and what is actually connected. */
export default function Page() {
  return <SettingsWorkbench />;
}
