import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Privacy Policy</h1>
      <p className="mt-4 max-w-3xl text-[var(--muted)]">
        DigiConnect Dukan collects account, application and payment information solely to deliver digital services.
        We do not sell personal data. Contact support for access or deletion requests.
      </p>
    </div>
  );
}
