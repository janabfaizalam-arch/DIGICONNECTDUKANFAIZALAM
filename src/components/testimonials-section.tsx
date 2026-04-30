import { Star } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";

const testimonials = [
  {
    name: "Rahul Verma",
    location: "India",
    quote: "The PAN card application process was fast and smooth.",
  },
  {
    name: "Neha Gupta",
    location: "India",
    quote: "Clear guidance for Aadhaar update and document submission.",
  },
  {
    name: "Amit Sahu",
    location: "India",
    quote: "Very helpful support for GST registration.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="section-pad bg-white/45">
      <div className="container-shell space-y-12">
        <SectionHeading
          eyebrow="Testimonials"
          title="Customers trust DigiConnect Dukan"
          description="Fast response, clear document guidance, and reliable application support for customers across India."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
              <div className="flex gap-1 text-[var(--secondary)]" aria-label="5 star rating">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-5 text-sm leading-relaxed text-slate-600">&quot;{testimonial.quote}&quot;</blockquote>
              <figcaption className="mt-5">
                <p className="font-bold text-slate-950">{testimonial.name}</p>
                <p className="text-sm text-slate-500">{testimonial.location}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
