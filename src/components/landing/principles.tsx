import { Container } from "@/components/layout/container";

const PRINCIPLES = [
  {
    title: "Every point is traceable",
    text: "The same inputs always produce the same score. Each of the eight factors shows its value, its band and the points it earned.",
  },
  {
    title: "Leverage is measured after the loan",
    text: "Debt is assessed including the requested amount, so the analyst sees the company as it would look once funded.",
  },
  {
    title: "Critical flags cap the grade",
    text: "Negative EBITDA, negative equity, interest coverage below 1.0× or a current ratio below 0.8 limit the grade to High. They highlight the case; they never decide it.",
  },
  {
    title: "AI explains, it doesn't decide",
    text: "Written summaries and answers to analyst questions will use only the application's figures and calculated ratios. The score itself is never produced by AI.",
    planned: true,
  },
];

export function Principles() {
  return (
    <section className="border-y border-border bg-card py-20 lg:py-28">
      <Container className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <h2 className="font-display text-4xl font-semibold tracking-tight">Built to support the analyst&apos;s judgement</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            A credit tool is only useful if the analyst can explain its output to a credit committee. Credify is designed
            around that.
          </p>
        </div>

        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="border-t border-border pt-5">
              <h3 className="flex flex-wrap items-center gap-2 text-lg font-medium">
                {p.title}
                {p.planned && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    Planned
                  </span>
                )}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
