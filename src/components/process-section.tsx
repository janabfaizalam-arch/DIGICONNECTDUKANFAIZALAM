const steps = [
  {
    title: "Apply",
    description: "Choose the service you need and start the request online.",
  },
  {
    title: "Submit",
    description: "Share accurate details and required documents through the secure flow.",
  },
  {
    title: "Get Service",
    description: "Receive updates through dashboard, call, and WhatsApp until completion.",
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="section-pad">
      <div className="container-shell space-y-8 md:space-y-10">
        <div className="reveal-on-scroll mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">How It Works</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">Apply, submit, and get service updates</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            A compact workflow for digital services in India, from request to status update.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="liquid-card reveal-on-scroll group rounded-[1.35rem] p-5 transition duration-300 hover:-translate-y-1 md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-sky-500 text-lg font-bold text-white shadow-lg shadow-blue-600/20 transition group-hover:shadow-blue-600/30">
                0{index + 1}
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-950">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
