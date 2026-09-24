import { redirect } from "next/navigation";

/** Canonical DC Partner education route is /ap/training. */
export default function APKnowledgeRedirectPage() {
  redirect("/ap/training");
}
