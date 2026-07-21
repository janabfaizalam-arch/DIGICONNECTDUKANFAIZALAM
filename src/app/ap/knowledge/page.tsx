import { redirect } from "next/navigation";

/** Canonical Digi Partner education route is /ap/training. */
export default function APKnowledgeRedirectPage() {
  redirect("/ap/training");
}
