# Credify

An SME credit decisioning platform, built as a portfolio project.

A small business applies for a loan. Credify calculates credit ratios and a transparent, rule-based risk score. A bank credit analyst reviews the analysis and makes the decision.

> **Model scope.** Credify's scorecard is an illustrative decision-support model built for demonstration. It is not a real bank underwriting model. It never approves or rejects an application: a credit analyst reviews every case and makes the final decision. All companies and figures are fictional.

## Run it locally

Requires Node.js 20.9 or newer.

```bash
npm install      # download dependencies (first time only)
cp .env.example .env.local   # then paste in your Supabase credentials
npm run dev      # start the development server at http://localhost:3000
npm test         # run the credit-engine test suite
npm run build    # check that the production build succeeds before pushing
```

`npm test` needs no database and no environment variables: the credit engine is a pure
function, so the suite is figures in, numbers out.

The landing page, the application form and its validation all run without a database. Only
**submitting** an application, and the two pages that read one back, need Supabase. Without
credentials those screens show a clear "not connected" panel rather than an error.

Setting Supabase up takes about five minutes and is done by hand, once:
**[`supabase/README.md`](./supabase/README.md)**.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) with TypeScript |
| Styling | Tailwind CSS v4, components in the shadcn/ui pattern |
| Database | Supabase Postgres, reached only from the server |
| Credit engine | Plain TypeScript, no dependencies, no AI |
| Charts | Recharts |
| Tests | Vitest (dev dependency only) |
| Hosting | Vercel, deployed automatically from GitHub |

## Project structure

```
src/
  app/                    Pages. The folder path is the web address.
    layout.tsx            Wraps every page: fonts, header, footer
    globals.css           Design tokens (colours, fonts, radius)
    page.tsx              Landing page  (/)
    apply/                Loan application  (/apply)
      actions.ts          Server action: validates, then stores a submission
      submitted/[token]/  Confirmation screen with the reference number
    status/[token]/       Applicant status page: status only, no figures
    analyst/              Analyst dashboard  (/analyst)
      applications/[id]/  Borrower analysis, keyed on the internal id
    methodology/          Scoring methodology  (/methodology) Day 5
  components/
    layout/               Header, footer, logo, demo-mode switch
    landing/              Landing page sections
    apply/                The four-step form, its steps and the review screen
    analyst/              Dashboard cards, chart, table and borrower-page sections
    ui/                   Generic building blocks (button, form fields)
    risk-badge.tsx        Grade badge used across the app
    status-badge.tsx      Application status badge
    risk-scale.tsx        The 0-100 risk scale
  lib/
    risk-grades.ts        Single source of truth for grades, disclaimer, model version
    demo-mode.ts          Works out Applicant/Analyst view from the URL
    format.ts             Euro and date formatting, shared by every screen
    credit/               THE CREDIT ENGINE
      index.ts            Public API: assess(input) -> assessment
      types.ts            The engine's contract, in and out
      scorecard.ts        v1.0 weights and thresholds. The only place they are written
      ratios.ts           Ratio maths, with every division guarded
      data-quality.ts     Input-consistency checks, kept out of the score
      engine.ts           Scoring, critical flags, grade cap, explanations
      __tests__/          233 tests, including the Nordwerk reference case
    analyst/              Dashboard domain logic, kept out of the components
      scoring.ts          Stored row -> credit engine, or "incomplete"
      list.ts             Table rows, KPI summary, risk distribution
      filters.ts          Filtering and sorting, as pure functions
      ratio-meanings.ts   One plain sentence per ratio
      __tests__/          77 tests
    applications/
      schema.ts           Zod schema: the definition of a valid application
      options.ts          Dropdown choices, shared with the schema
      status.ts           The five application statuses
      reference.ts        Reference-number generation, URL-token checks
      repository.ts       The only file that knows the table's shape
      sample.ts           The "Fill with sample data" example
    supabase/server.ts    Server-only database client
    sample/
      nordwerk.ts         The sample borrower's figures and its assessment
      nordwerk-preview.ts The landing-page scorecard, derived from the engine
supabase/
  schema.sql              The table. Run once in the Supabase SQL Editor.
  migrations/             One-off changes for a project that already exists
  README.md               Manual setup steps
vitest.config.mts         Test runner configuration
```

## Decision log

**Scorecard v1.0 (agreed before build)**

1. The factor measuring interest capacity is named **Current interest coverage** (EBITDA / current interest expense). It does not yet include interest or principal on the requested loan. A debt service coverage ratio with explicit loan-rate assumptions is planned as a later feature.
2. The whole scorecard is labelled as an **illustrative decision-support model**, not a bank underwriting model, wherever scores appear.
3. Risk grades: **Low** (80–100), **Moderate** (65–79), **Elevated** (50–64), **High** (35–49), **Very High** (0–34).
4. Critical flags (EBITDA of zero or less, negative equity, interest coverage below 1.0x, current ratio below 0.8) act as **risk-grade caps**: the grade cannot be better than High. They are not automatic approve or reject rules; the analyst always decides.
5. The applicant status page shows **status only, never financial figures**. Its link uses a random ID, which is demo-only access, not authentication.
6. Weights and thresholds stay as proposed for v1.0 and are refined later.

**Day 1**

- **No login in the MVP.** A labelled demo-mode switch changes between the Applicant and Analyst views. Authentication adds complexity without demonstrating anything about credit decisioning.
- **The mode comes from the URL** (`/analyst...` means Analyst view), so nothing has to be stored, and links and the back button always behave correctly.
- **All colours are design tokens** in `globals.css`. Green, amber and red are reserved for risk meaning only.
- **Grades are defined once** in `lib/risk-grades.ts`, so every screen shows identical labels and ranges.
- **Unbuilt pages show a clear placeholder** instead of an error, so the live site never has broken links.

**Day 2**

- **One table, with typed columns.** The eleven financial figures are real `numeric` columns,
  not a JSON blob: they are what the Day 3 scorecard reads and what the Day 4 dashboard
  sorts by, so they get types, CHECK constraints and indexes. No `users`, `documents` or
  `scores` tables exist, because nothing needs them yet.
- **The browser never talks to Supabase.** There is no login, so any Row Level Security
  policy loose enough to let an anonymous applicant read their own application would also
  let anyone read everyone's. Instead RLS is switched on with **no policies at all**, which
  refuses every public key, and the server holds the one key that bypasses it — Supabase's
  **secret** key (`sb_secret_…`, the replacement for the deprecated `service_role` key), in
  `SUPABASE_SECRET_KEY`. There is deliberately **no publishable key** anywhere in the
  project, because nothing in the browser needs one. Every query is therefore code in this
  repository, and `src/lib/supabase/server.ts` is marked `server-only`, so a build **fails**
  if that file is ever pulled into the browser bundle.
- **Table permissions are in version control, not in a dashboard toggle.** `schema.sql`
  grants `service_role` exactly `SELECT`, `INSERT` and `UPDATE` (never `DELETE` — an
  application is a record, and an analyst changes a status rather than removing a case), and
  explicitly revokes `anon` and `authenticated`. Grants are a separate gate from RLS: without
  one, a query is refused before RLS is consulted. Supabase's "Automatically expose new
  tables" setting is off by default on new projects, so these grants are what make the table
  reachable by Credify at all — and doing it in SQL keeps the permissions reviewable in a
  diff instead of depending on a project setting.
- **Two identifiers, two jobs.** `reference` (`CR-2026-7K4QP2`) is short, readable and
  quotable — and grants nothing. `access_token` is a random UUID and is the only way to
  open an application's status page. Quoting a reference in an email therefore does not
  hand over access.
- **The status page shows three things**: reference, status, and the analyst's message if
  there is one. Its link has no password and can be forwarded, so it is built to be worth
  nothing to a stranger. The restriction is enforced in the query — `getApplicantStatus`
  selects four columns and no financial one — not by remembering not to render something.
  The score and grade stay off it permanently, not just until Day 3.
- **One schema, validated twice.** The same Zod schema checks each step in the browser and
  the whole application again on the server. Only the server run is trusted; a server
  action is a public endpoint.
- **Nothing is stored until submit.** No draft rows, no local storage. An abandoned
  application leaves no trace of a company's finances anywhere.

**Day 3 — the credit engine**

- **The engine is deterministic, and no AI touches any number.** A credit decision has to be
  explainable to the borrower who was refused, to the analyst who signed it, and to a
  regulator reading the file two years later. The score is a sum of eight table lookups and
  the sentences are templates filled with the values that produced them, so the same input
  gives the same output every time and every number can be traced to the figure behind it. A
  language model varies between runs, cannot show which input drove the result, and would be
  guessing at exactly the point where the work has to be exact. It has no place here.
  Generating *prose about* a finished assessment is a different job, and a later one.
- **Leverage is scored PRO FORMA**, `(existing debt + requested loan) / EBITDA`. The lender's
  question is not "can this business carry the debt it already has" — it plainly can, or it
  would not still be trading — but "can it carry the debt it is about to have". Scoring
  today's leverage would approve the loan on the strength of the balance sheet that exists
  before the money is lent. Current leverage is still shown beside it, so the analyst can see
  exactly what the loan changes.
- **"Current Interest Coverage" is deliberately not called DSCR.** It is `EBITDA / current
  interest expense`: the interest burden the business carries **today**. It contains neither
  the interest nor the principal of the loan being requested, because the MVP models no
  interest rate and no amortisation schedule. A real debt service coverage ratio would need
  both. Calling this one DSCR would claim a post-financing view the model does not have — the
  single easiest way for a credit model to mislead the person relying on it. When a true DSCR
  arrives it belongs *beside* this factor, not disguised as it.
- **ROA and ROE are shown but never scored.** Net profit margin already carries 15 points for
  profitability. Return on assets and return on equity are built from the same net income
  figure over a different denominator, so scoring them would count one year's profit three
  times and quietly turn a 15-point weight into something nearer 35 — one good or bad year
  would then swing the grade far more than intended. ROE is worse still: its denominator is
  the smallest number on the balance sheet, so it explodes as equity approaches zero and a
  nearly insolvent company can post a spectacular figure. Both are genuinely useful for an
  analyst to read, which is why they are calculated and displayed.
- **Critical flags cap the grade; they never reject.** Four conditions — EBITDA at or below
  zero, negative equity, interest coverage under 1.0×, a current ratio under 0.8 — hold the
  grade at no better than High. An automatic rejection would make this a decision engine, and
  it cannot see the things that legitimately rescue such a case: a parent guarantee, security
  worth more than the loan, a signed contract that fixes next year, an owner injecting
  capital. What it can honestly do is refuse to call the case low risk. The score is left
  untouched, so the analyst sees both what the business scored and why it is not being shown
  as its score alone would suggest.
- **Data quality is a separate channel from credit risk.** A balance sheet that does not
  balance is usually a typo, not a solvency problem, so it produces a warning and changes no
  points. Scoring it would punish a mistake as though it were a risk; ignoring it would hand
  the analyst a confident number built on figures nobody trusts.
- **Division by zero can never reach the interface.** Every division is guarded and returns a
  named reason rather than a number. This is not defensive decoration: in JavaScript every
  comparison against `NaN` is false, so a `NaN` reaching the scorer would fail every threshold
  and silently drop into the worst band, marking a company down with nothing in the output to
  say why. Negative EBITDA is guarded for the mirror-image reason — a negative leverage ratio
  passes every "lower is better" threshold, so an unguarded loss-making business would score
  full marks on the heaviest factor in the model.
- **Shareholders' equity and total liabilities are REPORTED, never derived.** An earlier
  version computed equity as `total assets − interest-bearing debt − current liabilities`.
  That is wrong in both directions: interest-bearing debt overlaps with current liabilities
  (the current portion of a term loan sits in both), and current liabilities exclude
  long-term non-debt items such as provisions, deferred tax and lease obligations. The net
  error usually **overstates** equity — the dangerous direction, because the negative-equity
  critical flag then fires less often than it should. Both figures are now fields on the
  application form. This also makes the balance-sheet check real: while equity was derived
  from `assets − liabilities`, the identity `assets = liabilities + equity` held by
  construction and no mismatch could ever be detected.
- **A zero denominator is not automatically the worst case.** Two situations produce no
  ratio but are not bad news, and both now score on the figures as reported:
  - **Debt outstanding with no reported interest expense** — interest coverage scores full
    marks, because the reported figures show no interest burden, *and* a data-quality
    warning asks the analyst to confirm the debt really is interest-free (a shareholder or
    group loan, say) rather than the figure being a typing error.
  - **No current liabilities** — liquidity scores full marks, because nothing falls due
    within the year, with a warning asking for the figure to be confirmed.

  Docking points in either case would score a *suspected data-entry error* as though it were
  credit risk, which is exactly the mixing of concerns the engine avoids everywhere else.
  The analyst gets the score and the doubt as two separate signals and can act on either.
  Neither case raises a critical flag: a ratio with no value is not evidence of anything.
- **The landing page now renders engine output.** The eight rows of the home-page scorecard
  were hand-calculated constants until Day 3. They are computed by `assess()` now, so the
  marketing page and the model cannot drift apart: change a threshold and either the preview
  moves with it or the Nordwerk test fails.

**Day 4 — the analyst experience**

- **The credit engine stays the single source of truth.** No analyst screen calculates a
  ratio, a score, a grade or a sentence. `lib/analyst/scoring.ts` turns a stored row into a
  `CreditInput`, calls `assess()`, and the components render what comes back. That is why
  the landing page, the dashboard and the test suite can never disagree about Nordwerk:
  there is one model and three views of it.
- **The dashboard is server-rendered; only the table rows cross to the browser.** The page
  reads the applications, scores them and computes the portfolio numbers on the server. What
  is serialised into the page is an `AnalystListItem` per application — nine columns — not
  the full accounts. Shipping every borrower's complete financials just to render a table
  would put the whole book's figures into the page source. The borrower page is fully
  server-rendered with no client component at all.
- **Analyst routes are keyed on the internal `id`, never the applicant's `access_token`.**
  Those are different things: the token is a *capability* that opens a borrower's private
  status page for anyone holding the link, while the id grants nothing on its own. Routing
  the analyst screens on the token would have put a working applicant key into every analyst
  URL, browser history and screen-share. The token is excluded from the analyst `SELECT`
  itself rather than merely left unrendered, and a test asserts that against the query.
- **An application missing a required figure is not scored.** Rows submitted before total
  liabilities and equity existed come back marked *Incomplete financial data*, naming exactly
  which figures are missing, with the reported ones still shown. Nothing is derived,
  defaulted to zero or estimated — deriving equity here to paper over the gap is precisely
  what the Day 3 correction removed. A plausible-looking score built on absent data is far
  more dangerous to an analyst than an obvious gap.
- **Unscored applications are excluded from the average, not counted as zero.** Averaging a
  missing figure in as a zero would drag the portfolio's apparent quality down for a reason
  that has nothing to do with credit, so the KPI card states its own denominator. For the
  same reason they are not a sixth bar on the risk chart: they have no grade.
- **Nulls sort last, in both directions.** An application that cannot be scored is *unknown*,
  not bad. Letting a null score sort as zero would plant unscoreable rows among the worst
  credits, which is exactly the wrong reading.
- **Filtering and sorting are pure functions in `lib/analyst/filters.ts`.** The table
  component decides how a control looks; that file decides what "sort by score, worst first"
  means. The interesting bugs in a dashboard live in the comparator, so that is what the
  tests exercise — no DOM, no browser-testing framework.
- **Critical flags, the narrative, and data quality are three separate blocks on the
  borrower page**, because they answer three different questions: what caps the grade, what
  explains the score, and what is wrong with the figures. The data-quality block states in
  its own header that none of it changes the score.
- **Status is displayed, not editable.** Approving, rejecting and requesting information are
  Day 5. The page shows the current status and any message already sent, and says so.
- **Cash is collected but never scored.** It is a *component* of current assets, so scoring
  it as its own factor would count the same asset twice — the liquidity factor already
  measures it through the current ratio. It is collected so the engine can check that cash
  sits inside current assets, and so an analyst can see how much of a borrower's liquidity
  is actual cash rather than stock and receivables.
- **A missing cash figure is not the same kind of gap as a missing equity figure.** Total
  liabilities and equity are inputs the scorecard genuinely needs, so a row without them
  cannot be scored. Cash is not, so a row without it scores exactly as it would have —
  only the cash check goes unrun. Cash is therefore *required on the form* (every new
  submission has it) but *optional to the engine* (older rows are unaffected). Treating it
  as required in both places would have stranded every pre-cash row as unscoreable for no
  gain in the analysis.

**Known limitations of scorecard v1.0**

- **One set of thresholds is applied to every industry, and that is the model's biggest
  weakness.** A 1.2 current ratio is comfortable for a consultancy that carries no stock and
  is collected in thirty days; it is tight for a manufacturer financing raw materials and
  work in progress. 2.5× leverage is modest for a utility-like business with predictable
  cash flows and aggressive for a construction firm whose revenue arrives in lumps. Because
  the bands are fixed, v1.0 systematically flatters asset-light service businesses and
  penalises working-capital-intensive ones. The application already collects industry, so
  the data to fix it is being gathered; the correction is industry-specific bands, or a
  benchmark percentile within an industry, in a later version.
- **The weights are reasoned, not fitted.** They are a considered starting point for an
  illustrative model, not coefficients calibrated against observed defaults. A real
  underwriting scorecard would be fitted to a default book and revalidated.
- **One year of figures, self-reported and unaudited.** No trend beyond a single revenue
  comparison, no verification, no bank statements, no management quality, no sector outlook,
  no security or guarantees. A real credit file contains all of these; the analyst supplies
  them.
- **One year of figures is self-reported and unverified.** The engine trusts what the
  applicant typed. Confirming it against filed accounts or bank statements is the analyst's
  job, and the data-quality warnings exist to tell them where to look first.
