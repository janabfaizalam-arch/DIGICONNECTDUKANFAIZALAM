# TOOLS.md — local conventions

- Run workspace scripts from the workspace root, e.g.
  `node skills/social-publish/scripts/social.mjs status`.
- Publisher commands: `status`, `preview`, `post`, `comments`, `reply`, `recent`.
  `post` and `reply` do nothing without `--confirm` (see `social-publish`).
- Posters: use `image_generate`, save into `media/`.
- Research: use web search and `web_fetch`; prefer official `.gov.in` sources.
- Website sitemap for valid page paths: https://www.rnos.in/sitemap.xml
- Never print environment variables (`env`, `printenv`, `echo $TOKEN`) or read
  `~/.openclaw/` credential files.
