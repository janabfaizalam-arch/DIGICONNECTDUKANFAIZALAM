import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";

const port = Number(process.env.SMOKE_PORT ?? 3100);
const baseUrl = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${port}`;
const shouldStartServer = !process.env.SMOKE_BASE_URL;

const publicRoutes = [
  "/",
  "/services",
  "/services/gst-registration",
  "/apply/gst-registration",
  "/login/customer",
  "/ap/login",
  "/admin-login",
  "/unauthorized",
];

const protectedRoutes = [
  "/admin",
  "/admin/applications",
  "/ap/dashboard",
  "/customer/dashboard",
];

// Legacy / retired routes that must redirect or stay unavailable to anonymous users.
const legacyRedirectRoutes = [
  "/login/agent",
  "/agent/dashboard",
  "/admin/agents",
  "/admin/leads",
  "/ap/leads",
  "/customer-v2/dashboard",
  "/customer-auth-v2/login",
];

let server;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, redirect = "follow") {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect,
    signal: AbortSignal.timeout(15_000),
  });

  return response;
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 45_000) {
    try {
      const response = await request("/");
      if (response.ok) return;
    } catch {
      await wait(750);
    }
  }

  throw new Error(`Server did not become ready at ${baseUrl}`);
}

async function run() {
  if (shouldStartServer) {
    const command = process.platform === "win32" ? `npm run start -- -p ${port}` : "npm";
    const args = process.platform === "win32" ? [] : ["run", "start", "--", "-p", String(port)];
    server = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: process.env,
    });

    server.stdout.on("data", (chunk) => process.stdout.write(chunk));
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
    await waitForServer();
  }

  const failures = [];

  for (const route of publicRoutes) {
    try {
      const response = await request(route);
      console.log(`${route} -> ${response.status}`);
      if (!response.ok) {
        failures.push(`${route} returned ${response.status}`);
      }
    } catch (error) {
      failures.push(`${route} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const route of protectedRoutes) {
    try {
      const response = await request(route, "manual");
      console.log(`${route} -> ${response.status}`);
      if (![302, 303, 307, 308].includes(response.status)) {
        failures.push(`${route} should redirect unauthenticated users, got ${response.status}`);
      }
    } catch (error) {
      failures.push(`${route} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const route of legacyRedirectRoutes) {
    try {
      const response = await request(route, "manual");
      console.log(`${route} (legacy) -> ${response.status}`);
      if (![301, 302, 303, 307, 308, 404, 410].includes(response.status)) {
        failures.push(`${route} should redirect or be unavailable, got ${response.status}`);
      }
    } catch (error) {
      failures.push(`${route} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Retired JWT auth APIs must return 410 Gone.
  for (const route of ["/api/customer-auth/login", "/api/customer/auth/login", "/api/lead", "/api/ap/debug/seed"]) {
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        method: route.includes("debug") ? "GET" : "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
      console.log(`${route} -> ${response.status}`);
      if (route.includes("debug") && response.status !== 404) {
        failures.push(`${route} should return 404, got ${response.status}`);
      } else if (!route.includes("debug") && response.status !== 410) {
        failures.push(`${route} should return 410, got ${response.status}`);
      }
    } catch (error) {
      failures.push(`${route} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length) {
    throw new Error(`Smoke test failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  }

  console.log(`Smoke test passed for ${baseUrl}`);
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) {
      if (process.platform === "win32") {
        try {
          execFileSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
        } catch {
          // The process may have already exited after a failed start.
        }
      } else {
        server.kill("SIGTERM");
      }
    }
  });
