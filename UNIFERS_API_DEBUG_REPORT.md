# UNIFERS API DEBUG REPORT

## 1. Exact URL Being Hit
Depending on the environment configuration, the following URLs were constructed:
* **Host `bifrost.unifers.ai` with `/api` path**: `https://bifrost.unifers.ai/api/enrich/get-cibil-report`
* **Host `bifrost.unifers.ai` without `/api` path**: `https://bifrost.unifers.ai/enrich/get-cibil-report`
* **Host `app.unifers.ai` with `/api` path**: `https://app.unifers.ai/api/enrich/get-cibil-report`

## 2. Exact HTTP Status
* **`https://bifrost.unifers.ai/api/enrich/...`**: `404 Not Found` (HTML returned)
* **`https://bifrost.unifers.ai/enrich/...`**: `401 Unauthorized` (JSON returned: `{"error": true, "message": "Invalid access token"}`)
* **`https://app.unifers.ai/...`**: `404 Not Found` / `301 Redirect` (HTML returned)

## 3. Exact HTML Page Returned
When hitting `https://bifrost.unifers.ai/api/enrich/...`, NGINX/hosting server returns a standard HTML 404 error page starting with:
```html
<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
...
```
This is parsed by `response.json()` causing the runtime JSON syntax error:
`Unexpected token '<' "<!doctype ..." is not valid JSON`.

## 4. Whether Endpoint is Wrong
Yes, the endpoint prefix is wrong depending on the host:
* When hitting **`bifrost.unifers.ai`**, the path should **NOT** start with `/api` (e.g. `/enrich/get-cibil-report` is correct, `/api/enrich/get-cibil-report` is wrong).
* When hitting **`app.unifers.ai`**, the path should start with `/api` (e.g. `/api/enrich/get-cibil-report` is correct).

We resolved this by implementing an adaptive endpoint builder `getEndpointUrl` in [provider.ts](file:///c:/Users/ASUS/Desktop/digiconnectdukanfaizalam/src/lib/credit/provider.ts) which automatically omits the `/api` prefix when `bifrost.unifers.ai` is detected in the base URL, but prepends it for other domains.

## 5. Whether Auth Failed
Yes, when correct endpoints like `/enrich/get-credit-info` are hit on `bifrost.unifers.ai`, the API returns a JSON error response:
```json
{
  "error": true,
  "message": "Invalid access token"
}
```
This indicates that the token configured as `UNIFERS_API_TOKEN` is expired or invalid for this environment.

## 6. Whether Redirect Occurred
No redirect occurred for the `bifrost.unifers.ai` domain, but the server immediately returns a `404 Not Found` response with a text/html content-type. Hitting `app.unifers.ai` directly may redirect to default dashboards or yield 404.

---

## 7. Resolution & Recommendations
1. **Content-Type Validation**: We added code in [provider.ts](file:///c:/Users/ASUS/Desktop/digiconnectdukanfaizalam/src/lib/credit/provider.ts) to check the response content-type first. We only attempt to parse the response as JSON if `content-type` contains `application/json`.
2. **Detailed Logging**: If the response is `text/html`, we log the full HTML content and throw an explicit error message instead of letting the JSON parser fail with syntax errors.
3. **Verify Auth Token**: The system administrator should verify and refresh the `UNIFERS_API_TOKEN` environment variable in the production deployment.
