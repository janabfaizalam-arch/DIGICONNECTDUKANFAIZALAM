# TOOLING STATUS — Resolved for local validation

Date updated: 2026-07-18 (Pass 4)

Shell execution and project validation are **working** in the local environment. This file no longer claims that commands are unavailable.

---

## Resolved blockers (how tooling was restored)

1. **Wrong working directory** — early agent shells sometimes started in `C:\Windows\System32` instead of the project root. Always `Set-Location D:\digiconnectdukanfaizalam` (or open the folder as the Cursor workspace root).
2. **Git safe-directory ownership check** — Git refused operations until the repo path was marked safe for the current Windows user (ownership mismatch). Fixed on the owner machine via Git safe.directory configuration (do not change git config from the agent unless explicitly requested).
3. **pnpm build-script approval** — first `pnpm install` required approving lifecycle/build scripts; after approval, dependencies installed successfully.
4. **Dependencies installed** — `node_modules` present; `pnpm-lock.yaml` (lockfile v9) is the source of truth.
5. **Validation completed** — `pnpm run type-check`, `pnpm run lint` (`eslint .`), and `pnpm run build` all exit 0 as of Pass 4. See `PASS4_RUNTIME_VALIDATION.md`.

---

## Canonical toolchain

| Item | Value |
|---|---|
| Project root | `D:\digiconnectdukanfaizalam` |
| Package manager | **pnpm** (not npm for install — lockfile is `pnpm-lock.yaml`) |
| Node | v20+ or v22+ recommended; validated on v24.18.0 |
| Lint | `pnpm run lint` → `eslint .` (flat config `eslint.config.mjs`) |
| Typecheck | `pnpm run type-check` → `tsc --noEmit` |
| Build | `pnpm run build` → `next build` |
| Smoke | `pnpm run smoke` → `node scripts/smoke-test.mjs` |

---

## Commands to re-validate after changes

```powershell
Set-Location D:\digiconnectdukanfaizalam
pnpm install --frozen-lockfile
pnpm run type-check
pnpm run lint
pnpm run build
pnpm run smoke
```

If type-check fails with missing modules under `.next/types/...` after deleting App Router files, delete `.next` and re-run type-check/build.

---

## Remaining tooling notes (non-blocking)

- Agent shell may still need `required_permissions: ["all"]` and PowerShell `;` separators (not bash `&&`) on this Windows host.
- `print-agent/` is a separate npm project; ignore for web app validation.
- There is still no unit-test runner in `package.json` (only smoke). That remains a product gap, not a tooling blocker.
