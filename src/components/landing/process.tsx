import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";

/**
 * The five-step lending workflow. Numbering is used because this really is a sequence.
 * Each step names who is responsible, which makes the division of work visible:
 * the system prepares the analysis, the analyst decides.
 */
const STEPS = [
  {
    title: "Apply",
    owner: "Applicant",
    text: "The business enters its company details, the loan request and its latest financial figures.",
  },
  {
    title: "Analyse",
    owner: "Credify",
    text: "Key credit ratios are calculated, including leverage after the new loan is added.",
  },
  {
    title: "Score",
    owner: "Credify",
    text: "A 100-point scorecard assigns a risk grade and shows the factors behind it.",
  },
  {
    title: "Review",
    owner: "Analyst",
    text: "The analyst sees the scorecard, flagged risks and data-quality warnings in one place.",
  },
  {
    title: "Decide",
    owner: "Analyst",
    text: "The analyst approves, rejects or asks for more information, and records the reason.",
  },
];

export function Process() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 lg:py-28">
      <Container>
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold tracking-tight">From application to decision</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Credify prepares the analysis. The analyst stays responsible for the decision.
          </p>
        </div>

        <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => {
            const isSystem = step.owner === "Credify";
            return (
              <li key={step.title} className={cn("border-t-2 pt-5", isSystem ? "border-primary" : "border-foreground")}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-2xl font-semibold tabular-nums">{i + 1}</p>
                  <p className={cn("text-sm", isSystem ? "text-primary" : "text-muted-foreground")}>{step.owner}</p>
                </div>
                <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
