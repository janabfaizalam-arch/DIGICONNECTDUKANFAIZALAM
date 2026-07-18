import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">About DigiConnect Dukan</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">
        DigiConnect Dukan is a focused digital services platform for essential government and business filings in India.
        We keep the product small on purpose: seven services, three roles, clear payments, and reliable tracking.
      </p>
    </div>
  );
}
