# Unifers API Endpoint Audit Report

This report documents the endpoint URL audits, target expected endpoints, and correction statuses for the Credit Score & Report module using the environment configuration base URL `https://app.unifers.ai/api`.

## Endpoint Mappings

| Endpoint Name | Documentation Path | Current URL (Built) | Expected URL | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication (Login)** | `/api/login` | `https://app.unifers.ai/api/api/login` | `https://app.unifers.ai/api/login` | **Corrected** |
| **Get CIBIL Report** | `/api/enrich/get-cibil-report` | `https://app.unifers.ai/api/api/enrich/get-cibil-report` | `https://app.unifers.ai/api/enrich/get-cibil-report` | **Corrected** |
| **Get CRIF Report** | `/api/enrich/get-crif-report` | `https://app.unifers.ai/api/api/enrich/get-crif-report` | `https://app.unifers.ai/api/enrich/get-crif-report` | **Corrected** |
| **Get Credit Info** | `/api/enrich/get-credit-info` | `https://app.unifers.ai/api/api/enrich/get-credit-info` | `https://app.unifers.ai/api/enrich/get-credit-info` | **Corrected** |
| **Download Report PDF** | `/api/enrich/download-report` | `https://app.unifers.ai/api/api/enrich/download-report` | `https://app.unifers.ai/api/enrich/download-report` | **Corrected** |

---

## Technical Auditing & Verification Details

1. **Root Cause of duplicate `/api/api` prefix**:
   Using the standard `new URL(path, base)` constructor when the base URL contains a path segment (like `/api`) strips the path segment if the path starts with a leading slash `/` (as `new URL()` resolves absolute paths relative to the domain origin). Previously, the code tried to adapt to `bifrost.unifers.ai` vs `app.unifers.ai` by modifying path variables. With `UNIFERS_API_BASE_URL` set to `https://app.unifers.ai/api/` (with a directory-style slash) and using relative paths without a leading slash, it resulted in a duplicate prefix `https://app.unifers.ai/api/api/enrich/...`.

2. **Resolution Applied**:
   We modified the endpoint resolution helper `getEndpointUrl` inside [provider.ts](file:///c:/Users/ASUS/Desktop/digiconnectdukanfaizalam/src/lib/credit/provider.ts) to adaptively strip the duplicate `/api` path segment if the base URL already ends with `/api`, resulting in correct origin and path-relative URLs:
   ```typescript
   export function getEndpointUrl(path: string, baseUrl: string): string {
     const base = baseUrl.replace(/\/$/, "");
     let relativePath = path.startsWith("/") ? path : "/" + path;

     if (base.endsWith("/api") && relativePath.startsWith("/api/")) {
       relativePath = relativePath.slice(4);
     } else if (base.endsWith("/api") && relativePath === "/api") {
       relativePath = "/";
     } else if (!base.endsWith("/api") && !relativePath.startsWith("/api/")) {
       relativePath = "/api" + relativePath;
     }

     const finalBase = base + "/";
     const finalPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;

     return new URL(finalPath, finalBase).toString();
   }
   ```

3. **Status Check**:
   - Verified that URL construction outputs are correct for all endpoints under all base URL formats (`https://app.unifers.ai/api`, `https://app.unifers.ai/api/`, `https://app.unifers.ai`, and `https://app.unifers.ai/`).
   - Project successfully compiles and builds.
