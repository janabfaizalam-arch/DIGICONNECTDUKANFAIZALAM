/** The private link a customer is sent to review and approve their quotation. */
export function getQuotePublicUrl(token: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in").replace(/\/$/, "");
  return `${siteUrl}/packages/quote/${token}`;
}
