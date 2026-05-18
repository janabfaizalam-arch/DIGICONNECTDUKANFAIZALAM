import { redirect } from "next/navigation";

export default function AgentDocumentsRequiredPage() {
  redirect("/agent/assigned-work");
}
