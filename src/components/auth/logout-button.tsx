"use client";

import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { inferLogoutPortal } from "@/lib/auth/logout-destinations";
import { createClient } from "@/lib/supabase/browser";

type LogoutButtonProps = {
  className?: string;
  onLoggedOut?: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost";
  showLabel?: boolean;
  /** Override portal detection when the button is rendered outside its portal shell. */
  portal?: "admin" | "ap" | "customer" | "auto";
};

export function LogoutButton({
  className,
  onLoggedOut,
  variant = "outline",
  showLabel = true,
  portal,
}: LogoutButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { success, error: toastError } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    const resolvedPortal = portal ?? inferLogoutPortal(pathname);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({ portal: resolvedPortal }),
        credentials: "same-origin",
      });

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        redirectTo?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || result.message || "Logout failed. Please try again.");
      }

      // Best-effort: clear any non-httpOnly browser Supabase remnants after server wipe.
      try {
        const supabase = createClient();
        await supabase?.auth.signOut({ scope: "local" });
      } catch {
        // Server already cleared httpOnly cookies — ignore client residuals.
      }

      onLoggedOut?.();
      success(result.message || "Signed out successfully.");

      const destination = result.redirectTo || "/login?loggedOut=1";
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setIsLoggingOut(false);
      toastError(error instanceof Error ? error.message : "Logout failed. Please try again.");
    }
  };

  return (
    <Button
      type="button"
      onClick={() => void handleLogout()}
      disabled={isLoggingOut}
      variant={variant}
      className={className}
      aria-label={showLabel ? undefined : "Logout"}
      aria-busy={isLoggingOut}
    >
      {isLoggingOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {showLabel ? (isLoggingOut ? "Signing out..." : "Logout") : null}
    </Button>
  );
}
