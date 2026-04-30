"use client";

import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type LogoutButtonProps = {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
};

export function LogoutButton({ className, variant = "outline" }: LogoutButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setIsLoggingOut(false);
      showToast(error instanceof Error ? error.message : "Logout failed. Please try again.", "error");
    }
  };

  return (
    <Button type="button" onClick={handleLogout} disabled={isLoggingOut} variant={variant} className={className}>
      {isLoggingOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Logout
    </Button>
  );
}
