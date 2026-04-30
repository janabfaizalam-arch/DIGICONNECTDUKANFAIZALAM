type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-black text-slate-950 md:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600 md:mt-4 md:text-lg md:leading-8">{description}</p>
    </div>
  );
}
