import { ApContentShell } from "@/components/ap/ap-content-shell";
import { APPanelNav } from "@/components/ap/ap-panel-nav";

export default function APLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <APPanelNav />
      <ApContentShell>{children}</ApContentShell>
    </>
  );
}
