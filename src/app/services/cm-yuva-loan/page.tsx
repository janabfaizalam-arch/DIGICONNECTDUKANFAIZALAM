import type { Metadata } from "next";

import { buildCmYuvaMetadata, CmYuvaPage } from "@/components/services/cm-yuva/cm-yuva-page";

/**
 * The CM YUVA page customers actually reach.
 *
 * This is the slug the services directory links to — the row an administrator
 * created — and until this route existed it fell through to the generic
 * service template, which rendered the title, a price and three empty boxes.
 * The dedicated page was built at the older `cm-yuva-entrepreneur-loan-
 * assistance` slug, which nothing on the site links to, so nobody saw it.
 */
const SLUG = "cm-yuva-loan";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildCmYuvaMetadata(SLUG);
}

export default function Page() {
  return <CmYuvaPage slug={SLUG} />;
}
