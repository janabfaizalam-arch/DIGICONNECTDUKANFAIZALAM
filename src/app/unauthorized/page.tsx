import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="container-narrow py-24 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Unauthorized</h1>
      <p className="mt-3 text-[var(--muted)]">You do not have access to that area.</p>
      <Link href="/" className="btn btn-primary mt-8 inline-flex">
        Go home
      </Link>
    </div>
  );
}
