import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Terms & Conditions</h1>
      <p className="mt-4 max-w-3xl text-[var(--muted)]">
        By using DigiConnect Dukan you agree to provide accurate information, complete required documents, and pay
        applicable service fees. Government outcomes remain subject to official processing timelines.
      </p>
    </div>
  );
}
