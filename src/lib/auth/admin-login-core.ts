/**
 * Server-side admin login orchestration helpers.
 * Client Components must import from `@/lib/auth/admin-login-shared` only.
 */
import "server-only";

export {
  TimeoutError,
  withTimeout,
  pickAdminProfile,
  isSupabaseAuthCookieName,
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  categorizeAdminLoginFailure,
  type AdminProfileRow,
  type AdminLoginFailureKind,
  type AdminLoginFailure,
} from "@/lib/auth/admin-login-shared";
