export const metadata = {
  title: "Privacy Policy | DigiConnect Dukan",
  description: "Privacy Policy for DigiConnect Dukan online digital services.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/76 p-6 shadow-liquid backdrop-blur-[20px] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Policy</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Privacy Policy</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600 md:text-base md:leading-8">
          <p>
            DigiConnect Dukan collects only the information needed to process digital service requests, provide account access, verify submitted details, and share service updates.
          </p>
          <p>
            Customer documents and personal details are handled for service support purposes and are not sold. Information may be shared only when required for the selected service, compliance, or secure platform operations.
          </p>
          <p>
            Users should submit accurate information and avoid sharing unnecessary sensitive data outside the official service flow.
          </p>
        </div>
      </div>
    </main>
  );
}
