import { Star } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";

const testimonials = [
  {
    name: "Rahul Verma",
    location: "Orai",
    quote: "PAN correction aur Aadhaar update ka process clear tha. Same day guidance mil gayi.",
  },
  {
    name: "Neha Gupta",
    location: "Jalaun",
    quote: "Documents ki list pehle hi mil gayi, isliye voter ID application quickly submit ho gaya.",
  },
  {
    name: "Amit Sahu",
    location: "Kalpi Road",
    quote: "GST registration ke liye local support chahiye tha. Team ne form aur follow-up dono handle kiya.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="section-pad bg-white/45">
      <div className="container-shell space-y-12">
        <SectionHeading
          eyebrow="Testimonials"
          title="Local customers trust DigiConnect Dukan"
          description="Orai aur Jalaun ke users ke liye fast response, clear documents aur practical application support."
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
