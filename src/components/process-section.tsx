const steps = [
  {
    title: "Login",
    description: "Create or access your account to begin the service request.",
  },
  {
    title: "Submit Details",
    description: "Share the required information and documents through the online flow.",
  },
  {
    title: "Get Service Support",
    description: "Receive guided updates and support until the service request moves ahead.",
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="section-pad">
      <div className="container-shell space-y-8 md:space-y-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Process</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Simple 3-Step Process</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            A clear digital workflow from account access to service support.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="liquid-card rounded-[1.75rem] p-5 md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-lg font-bold text-white shadow-lg shadow-blue-600/20">
                0{index + 1}
              </div>
              <p className="mt-5 text-xl font-bold text-slate-950">{step.title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
