# Model notes

The decisions behind Scorecard v1.0 that are worth being able to defend. The published,
user-facing version of this is `/methodology`; this file is the engineering companion.

---

## Why deterministic, and why no AI in the calculation

A credit decision has to be explainable to three people: the borrower who was refused, the
analyst who signed it, and a regulator reading the file in two years. This engine answers
all three, because the answer is always the same arithmetic — the score is a sum of eight
table lookups, and the explanatory sentences are templates filled with the values that
produced them.

A language model varies between runs, cannot show which input drove the result, and would be
guessing at exactly the point where the work must be exact. Generating prose *about* a
finished assessment is a different job and a defensible one; computing the assessment is not.

**Where determinism is bounded:** `yearsInBusiness` is derived from the founding year at the
moment of assessment, so the same application can score one point differently once a company
crosses a band boundary. That is correct — the company really has been trading longer — but
it is the one input that moves with the calendar.

## Why leverage is scored pro forma

`(existing debt + requested loan) / EBITDA`.

The lender's question is not "can this business carry the debt it already has" — it plainly
can, or it would not still be trading — but "can it carry the debt it is about to have".
Scoring today's leverage would approve the loan on the strength of the balance sheet that
exists *before* the money is lent. Current leverage is still displayed, so the analyst can
see exactly what the request changes.

## Why the coverage factor is not called DSCR

`EBITDA / current interest expense` measures the interest burden carried **today**. It
contains neither the interest nor the principal of the loan being requested, because the MVP
models no interest rate and no amortisation schedule.

Calling it DSCR would claim a post-financing view the model does not have — the single
easiest way for a credit model to mislead the person relying on it. A real DSCR belongs
*beside* this factor, not disguised as it.

## Why ROA and ROE are displayed but never scored

Net profit margin already carries 15 points for profitability. ROA and ROE are built from the
same net income over a different denominator, so scoring them would count one year's profit
three times and quietly turn a 15-point weight into nearer 35 — one good or bad year would
then swing the grade far more than intended.

ROE is worse: its denominator is the smallest number on the balance sheet, so it explodes as
equity approaches zero. A nearly insolvent company can post a spectacular ROE, which is the
opposite of what a risk score should reward.

## Why critical flags cap rather than reject

Four conditions — EBITDA ≤ 0, negative equity, coverage < 1.0×, current ratio < 0.8 — hold
the grade at no better than High.

An automatic rejection would make this a decision engine, and it cannot see what legitimately
rescues such a case: a parent guarantee, security worth more than the loan, a signed contract
that fixes next year, an owner injecting capital. A score built from one year of figures has
no business closing the file.

What it can honestly do is refuse to call the case low risk. **The score is left untouched**,
so the analyst sees both what the business scored and why it is not shown as its score would
suggest. The cap never *improves* a grade: a borrower already at Very High stays there, and
`gradeCapped` is false because the cap did not act.

## Why equity and total liabilities are reported, never derived

An earlier version computed equity as `total assets − interest-bearing debt − current
liabilities`. That is wrong in both directions: interest-bearing debt overlaps with current
liabilities (the current portion of a term loan sits in both), and current liabilities exclude
long-term non-debt items such as provisions, deferred tax and lease obligations. The net error
usually **overstates** equity — the dangerous direction, because the negative-equity flag then
fires less often than it should.

It also made the balance-sheet check impossible: while equity was derived from
`assets − liabilities`, the identity held by construction and no mismatch could ever be found.

## Why data quality is a separate channel

A balance sheet that does not balance is far more often a figure typed into the wrong box than
a solvency problem. Docking points would punish a typo as though it were risk; silently
scoring figures that contradict each other would hand the analyst a confident number built on
input nobody trusts. So the engine scores what it was given and says separately which figures
look wrong.

The same principle governs the two zero-denominator cases:

| Situation | Score | Warning |
|---|---|---|
| Debt outstanding, no reported interest | Coverage **20/20** — the figures show no interest burden | "confirm the debt is genuinely interest-free" |
| No current liabilities | Liquidity **15/15** — nothing falls due within the year | "confirm the figure" |

Neither raises a critical flag: a ratio with no value is not evidence of anything.

## Two traps in the arithmetic

**Negative EBITDA.** `(debt + loan) / negative EBITDA` is negative, and a negative number
passes every "lower is better" threshold. Without an explicit guard, a loss-making business
would score **25/25 on the heaviest factor in the model**.

**NaN.** Every comparison against `NaN` is false, so a `NaN` reaching the scorer would fail
every threshold and fall silently into the worst band — marking a company down with nothing
in the output to explain it. Every division is guarded and returns a *named reason* instead
of a number.

A third, smaller one: band comparisons carry a `1e-9` tolerance, because a figure that is
exactly −5% computes as `-0.050000000000000044` and would otherwise drop a whole band on
floating-point representation error alone.

## Why cash is collected but not scored

Cash is a *component* of current assets, and the liquidity factor already measures it through
the current ratio. Scoring it separately would count the same asset twice. It is collected so
the engine can check that cash sits inside current assets, and so an analyst can see how much
of a borrower's liquidity is actual cash rather than stock and receivables.

It is **required on the form** but **optional to the engine** — a row without it scores
exactly as it would have, so applications submitted before cash was collected are unaffected.

## Why an unscoreable application is refused rather than estimated

Total liabilities and equity are inputs the scorecard genuinely needs. A row missing either is
marked *Incomplete financial data*, naming exactly what is absent, with the reported figures
still shown. Nothing is derived, defaulted to zero or estimated: a plausible-looking score
built on absent data is far more dangerous to an analyst than an obvious gap.

## The limitation to lead with

**One set of thresholds is applied to every industry.** A 1.2 current ratio is comfortable for
a consultancy that carries no stock and is paid in thirty days; it is tight for a manufacturer
financing raw materials and work in progress. v1.0 therefore flatters asset-light service
businesses and penalises working-capital-intensive ones. The application already collects
industry, so the data to correct it is being gathered — industry-specific bands are the
intended next version.

Say this before you are asked. A model that is honest about its blind spots is more credible
than one that implies it has none.
