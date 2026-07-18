"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/ap/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, confirmPassword }),
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Password change failed");
      return;
    }
    router.push(data.redirectTo || "/ap/dashboard");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Change password</h1>
      <p className="mt-2 text-sm text-slate-600">First login par temporary password change mandatory hai.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          New password
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Confirm password
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={loading} className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
