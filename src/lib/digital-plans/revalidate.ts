import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import { HOMEPAGE_TAGS } from "@/lib/homepage/cache";

/**
 * After any packages or add-ons write: clear the cached catalogue and the
 * pages built from it, so the public site shows the new prices at once.
 */
export function revalidateDigitalCatalogue(slugs: string[] = []) {
  revalidateTag(HOMEPAGE_TAGS.digitalPlans);
  revalidatePath("/packages");
  revalidatePath("/digital-services");
  revalidatePath("/");
  for (const slug of slugs) revalidatePath(`/packages/${slug}`);
}
