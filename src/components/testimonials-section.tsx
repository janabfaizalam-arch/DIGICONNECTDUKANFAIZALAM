import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Verma",
    location: "India",
    quote: "The driving licence application guidance was clear and smooth.",
  },
  {
    name: "Neha Gupta",
    location: "India",
    quote: "Clear guidance for document submission and WhatsApp updates.",
  },
  {
    name: "Amit Sahu",
    location: "India",
    quote: "Very helpful support for GST registration.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-white/45 px-0 py-5 md:py-10">
      <div className="container-shell">
        <div className="mb-4 px-1">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Testimonials</p>
          <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-slate-950 md:text-3xl">Customers trust DigiConnect</h2>
        </div>
        <div className="flex snap-x snap-mandatory touch-pan-x gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="min-w-[75vw] max-w-[75vw] snap-start rounded-2xl border bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)] md:min-w-0 md:max-w-none md:p-6">
              <div className="flex gap-0.5 text-[var(--secondary)]" aria-label="5 star rating">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-3 text-xs leading-relaxed text-slate-600 md:text-sm">&quot;{testimonial.quote}&quot;</blockquote>
              <figcaption className="mt-3">
                <p className="text-sm font-bold text-slate-950">{testimonial.name}</p>
                <p className="text-xs text-slate-500">{testimonial.location}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
