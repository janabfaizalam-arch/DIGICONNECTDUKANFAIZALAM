import type { Metadata } from "next";

import { TrackForm } from "@/components/track-form";

export const metadata: Metadata = { title: "Track Application" };

export default function TrackPage() {
  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Track application</h1>
      <p className="mt-2 text-[var(--muted)]">Enter your tracking code to see the latest status.</p>
      <div className="mt-8 max-w-md">
        <TrackForm />
      </div>
    </div>
  );
}
