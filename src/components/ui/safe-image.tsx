import type { Ref } from "react";
import NextImage, { type ImageProps } from "next/image";

import { isOptimizableImage } from "@/lib/security/image-hosts";

/**
 * `next/image` for sources that may come from anywhere.
 *
 * Allowlisted hosts (see lib/security/image-hosts.ts) go through the optimiser
 * as before. Anything else — an admin-pasted link, a data: or blob: preview —
 * is rendered `unoptimized`, so the browser fetches it directly and our server
 * never proxies an arbitrary URL.
 */
export default function SafeImage(props: ImageProps & { ref?: Ref<HTMLImageElement> }) {
  const { src, unoptimized } = props;
  const optimizable = typeof src === "string" ? isOptimizableImage(src) : true;
  return <NextImage {...props} unoptimized={unoptimized || !optimizable} />;
}
