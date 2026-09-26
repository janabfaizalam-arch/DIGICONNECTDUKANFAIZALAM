import { createHmac, randomBytes } from "node:crypto";

/**
 * OAuth 1.0a request signing (HMAC-SHA1), as X requires for posting on behalf
 * of an account. Written out rather than pulled in as a dependency because it
 * is forty lines and the only place it is used.
 */

export function percentEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export type OAuth1Credentials = {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
};

export function oauth1Signature(input: {
  method: string;
  url: string;
  params: Record<string, string>;
  consumerSecret: string;
  tokenSecret: string;
}) {
  const normalised = Object.entries(input.params)
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const base = [input.method.toUpperCase(), percentEncode(input.url), percentEncode(normalised)].join("&");
  const key = `${percentEncode(input.consumerSecret)}&${percentEncode(input.tokenSecret)}`;
  return createHmac("sha1", key).update(base).digest("base64");
}

/**
 * The `Authorization` header for a request. `extraParams` are query or form
 * parameters that must be signed; a JSON body is not signed.
 */
export function oauth1Header(
  method: string,
  url: string,
  credentials: OAuth1Credentials,
  extraParams: Record<string, string> = {},
  nonce = randomBytes(16).toString("hex"),
  timestamp = Math.floor(Date.now() / 1000).toString(),
) {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: credentials.token,
    oauth_version: "1.0",
  };

  const signature = oauth1Signature({
    method,
    url,
    params: { ...extraParams, ...oauthParams },
    consumerSecret: credentials.consumerSecret,
    tokenSecret: credentials.tokenSecret,
  });

  const header = Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ");
  return `OAuth ${header}`;
}
