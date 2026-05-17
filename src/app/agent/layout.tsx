import { AgentPanelNav } from "@/components/agent/agent-panel-nav";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AgentPanelNav />
      {children}
    </>
  );
}
