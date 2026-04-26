"use client";

import Image from "next/image";
import { LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type DashboardShellProps = {
  name: string;
  email: string;
  avatarUrl: string;
};

export function DashboardShell({ name, email, avatarUrl }: DashboardShellProps) {
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

      showToast("Logout successful.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setIsLoggingOut(false);
      showToast(error instanceof Error ? error.message : "Logout failed. Please try again.", "error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="glass-panel w-full max-w-3xl rounded-[2rem] border-white/70 p-6 md:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-3xl object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-[var(--primary)] text-2xl font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Dashboard</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Welcome, {name}</h1>
              <p className="mt-2 text-slate-600">Aapka account secure hai aur session active hai.</p>
            </div>
          </div>
          <Button type="button" onClick={handleLogout} disabled={isLoggingOut} variant="outline" className="h-12">
            {isLoggingOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Logout
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-[var(--muted)] p-5">
            <p className="text-sm font-semibold text-slate-500">User Name</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{name}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold text-slate-500">Email</p>
            <p className="mt-2 break-all text-lg font-bold text-slate-950">{email}</p>
          </div>
          <div className="rounded-[1.5rem] bg-[var(--accent)] p-5">
            <div className="flex items-center gap-2 text-[var(--accent-foreground)]">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-sm font-semibold">Session Status</p>
            </div>
            <p className="mt-2 text-lg font-bold text-slate-950">Authenticated</p>
          </div>
        </div>
      </Card>
    </main>
  );
}
