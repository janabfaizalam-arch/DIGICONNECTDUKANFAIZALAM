/**
 * Video embeds in their privacy-friendly form.
 *
 * YouTube's youtube-nocookie.com host sets no YouTube cookies until the
 * visitor presses play, and Vimeo's `dnt=1` stops its player tracking the
 * session. Both play exactly the same video, so every embed goes through here
 * instead of trusting whatever link an administrator pasted.
 */
export function toPrivacyEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? "";
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parsed.pathname.match(/(?:\/video)?\/(\d+)/)?.[1];
    if (!id) return null;
    return `https://player.vimeo.com/video/${id}?dnt=1`;
  }

  return parsed.toString();
}
