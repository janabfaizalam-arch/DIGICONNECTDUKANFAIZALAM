"use client";

import { useState } from "react";

type TrackResult = {
  tracking_code?: string;
  status?: string;
  payment_status?: string;
  service_name?: string;
  error?: string;
};

export function TrackForm() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/applications/track?code=${encodeURIComponent(code.trim())}`);
      const data = (await response.json()) as TrackResult;
      setResult(data);
    } catch {
      setResult({ error: "Unable to track right now." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="e.g. DCDABCD12345"
        required
        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
      />
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Checking…" : "Track"}
      </button>
      {result ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm">
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <>
              <p className="font-medium">{result.service_name}</p>
              <p className="mt-1 text-[var(--muted)]">Status: {result.status}</p>
              <p className="text-[var(--muted)]">Payment: {result.payment_status}</p>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}
