export const metadata = {
  title: "Terms & Conditions | DigiConnect Dukan",
  description: "Terms and Conditions for DigiConnect Dukan online digital services.",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/76 p-6 shadow-liquid backdrop-blur-[20px] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Terms</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Terms & Conditions</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600 md:text-base md:leading-8">
          <p>
            DigiConnect Dukan provides online assistance for digital, documentation, government, and business service requests. Final approval, timelines, and outcomes may depend on the relevant official process or authority.
          </p>
          <p>
            Users are responsible for submitting correct information, valid documents, and required payments where applicable. Incorrect or incomplete submissions may delay service support.
          </p>
          <p>
            By using the platform, users agree to cooperate with verification, document requirements, and service-specific instructions shared through the portal.
          </p>
        </div>
      </div>
    </main>
  );
}
