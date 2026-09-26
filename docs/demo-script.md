# Credify: a 4-minute demo

Written for a live walkthrough in an interview. Timings are a guide, not a script to read
out. The bracketed lines are the sentences worth saying verbatim — they are the ones that
show you understand lending, not just React.

**Before you start:** open `/analyst` in one tab and `/apply` in another. If the dashboard
looks wrong, re-seed: `node --env-file=.env.local scripts/seed-demo-data.ts --confirm`.

---

## 0. The problem, in one breath (15s)

> "A small business applies for a loan. Somebody at the bank has to turn their accounts into
> a credit decision, and justify it. Credify does the analysis — ratios, a score, a grade,
> and the reasoning — so the analyst spends their time deciding rather than assembling."

---

## 1. Applicant flow (45s) — `/apply`

Click **Fill with sample data**, then **Go straight to review**.

> "Four steps: company, the loan request, the accounts, and a review before anything is
> submitted. The sample button is there so I don't type twelve financial figures at you."

Point at the review step.

> "Everything is validated by one schema that runs in the browser for speed and again on the
> server, because the server action is a public endpoint and the browser's check is only a
> convenience."

Don't submit. Switch to the analyst tab.

---

## 2. Analyst dashboard (30s) — `/analyst`

> "Six applications, a spread of grades, and the portfolio numbers at the top."

Point at the fourth KPI card.

> **"One of these can't be scored, so it's excluded from the average rather than counted as
> zero. That card tells you its own denominator."**

Sort by **Score**. Note the unscored row stays at the bottom.

> **"A missing score isn't a bad score. It's unknown, so it sorts last either way — putting
> it among the worst credits would be exactly the wrong reading."**

---

## 3. Nordwerk: why 78? (75s) — the core of the demo

Open **Nordwerk Precision GmbH**. Scroll to **How the score was built**.

> "78 out of 100, Moderate. The question an analyst actually asks is *why not higher*, so
> the right-hand column is points forgone."

Read the column aloud: −11 leverage, −3 liquidity, −4 profitability, −2 capital structure,
−1 revenue trend, −1 loan size.

> **"That's the entire 22-point gap to 100, itemised. Nobody has to read code to know why
> this isn't an 85."**

Now scroll up to the ratios and drop the two lines that carry the most weight:

> **"Leverage is scored *pro forma* — it includes the loan being requested. Scoring today's
> leverage would approve the loan on the balance sheet that exists before the money is
> lent."**

> **"And this is called Current Interest Coverage, not DSCR, because it models neither the
> interest rate nor the amortisation of the new loan. Calling it DSCR would claim a
> post-financing view the model doesn't have."**

---

## 4. The capped case (45s)

Back to the dashboard, open **Rheinbau Hochtief KG**.

> "76 points. On the numbers alone that's Moderate. But equity is negative, which is a
> critical flag, so the grade is held at High."

Point at the capped banner, then the critical-flags block.

> **"It's a cap, not a rejection. The model can't see a parent guarantee, security worth
> more than the loan, or an owner injecting capital next month — so it refuses to call this
> low risk and leaves the decision to a person. The score itself is untouched, so you can
> see both numbers."**

---

## 5. Recording a decision (45s)

Stay on Rheinbau. Scroll to **Decision**. Click **Request information**.

> "Three actions. Request information and Decline both require a message, because telling
> someone 'no' without saying why leaves them nothing to act on. Approve doesn't — 'yes'
> explains itself."

Type: *"Please confirm the timing and amount of the partners' capital injection."* →
**Continue**.

> "Then a confirmation step that names the company, shows exactly what the applicant will
> read, and reminds you whose decision this is."

Confirm. The status badge updates.

---

## 6. The applicant's side (20s)

Open the status link for that borrower (from the confirmation screen, or
`/status/<token>`).

> **"Their status page shows three things: the reference, the status, and the analyst's
> message. No score, no grade, no financial figures — the link has no password and gets
> forwarded, so it's built to be worth nothing to a stranger. That's enforced in the query:
> it selects four columns and none of them is financial."**

---

## 7. Methodology (30s) — `/methodology`

Scroll through the factor table.

> "The whole model is published: every band, every weight, the grades, the flags, and what
> the model can't see."

Point at a scoring-band table.

> **"And none of these numbers is typed on this page — they're read from the same
> configuration the engine scores with. The documentation can't drift away from the model,
> because a test fails if it does."**

Finish on the limitations section.

> **"The biggest weakness is that one set of thresholds is applied to every industry. A 1.2
> current ratio is comfortable for a consultancy and tight for a manufacturer financing
> stock. The form already collects industry, so the data to fix it is being gathered."**

---

## Closing line

> "Deterministic throughout. No AI anywhere near a number — the same input gives the same
> score every time, and every point traces back to the figure that earned it. That's what
> makes it explainable to the borrower who was refused, the analyst who signed it, and a
> regulator reading the file two years later."

---

## If they ask a hard question

| Question | Answer |
|---|---|
| "Why not use an LLM for the scoring?" | It varies between runs and can't show which figure drove the result. Generating prose *about* a finished assessment is a different, defensible job. |
| "How would you calibrate this properly?" | Fit the weights to an observed default book, test out of sample, revalidate on a schedule. Today they're reasoned, not fitted, and the methodology page says so. |
| "What happens with bad data?" | Data quality is a separate channel that never touches the score. A balance sheet that doesn't balance is usually a typo, not a solvency problem. |
| "Is this secure?" | The browser never talks to the database. RLS is on with no policies, and the one key that bypasses it lives only on the server. The applicant's status link is a capability, never exposed to the analyst UI. |
| "What's next?" | Industry-specific bands, a real DSCR with rate and amortisation, bureau data, and an AI layer that *explains* the assessment without ever computing it. |
