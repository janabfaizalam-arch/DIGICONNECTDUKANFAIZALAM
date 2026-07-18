import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Contact</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">
        Tell us what you need. We respond on WhatsApp and email during business hours.
      </p>
      <form action="/api/enquiry" method="post" className="mt-10 max-w-lg space-y-4">
        <label className="block text-sm">
          Name
          <input name="name" required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Mobile
          <input name="mobile" required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Email
          <input name="email" type="email" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Service
          <input name="service" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Message
          <textarea name="message" rows={4} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2" />
        </label>
        <button type="submit" className="btn btn-primary">
          Send enquiry
        </button>
      </form>
    </div>
  );
}
