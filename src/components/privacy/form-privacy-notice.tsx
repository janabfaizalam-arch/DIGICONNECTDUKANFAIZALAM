import Link from "next/link";

/**
 * The short notice that sits under a form collecting personal data.
 *
 * Each form passes its own `purpose` — "to call you back about this service",
 * "to fetch your credit report" — because a notice that says the same vague
 * thing everywhere is not really telling anyone anything.
 */
export function FormPrivacyNotice({
  purpose,
  className = "",
  tone = "light",
}: {
  purpose: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const text = tone === "dark" ? "text-slate-300" : "text-slate-600";
  const link = tone === "dark" ? "text-white" : "text-blue-800";
  return (
    <p className={`text-xs leading-relaxed ${text} ${className}`}>
      We use these details only {purpose}. We do not sell your data. See our{" "}
      <Link href="/privacy-policy" className={`font-semibold underline underline-offset-2 ${link}`}>
        Privacy Policy
      </Link>{" "}
      for how it is stored and your rights.
    </p>
  );
}
