import { redirect } from "next/navigation";

export default function AgentLoginRedirectPage() {
  redirect("/login/agent");
}
