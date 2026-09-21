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
npm run build    # check that the production build succeeds before pushing
```

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
    analyst/              Analyst dashboard  (/analyst)       Day 4
    methodology/          Scoring methodology  (/methodology) Day 5
  components/
    layout/               Header, footer, logo, demo-mode switch
    landing/              Landing page sections
    apply/                The four-step form, its steps and the review screen
    ui/                   Generic building blocks (button, form fields)
    risk-badge.tsx        Grade badge used across the app
    status-badge.tsx      Application status badge
    risk-scale.tsx        The 0-100 risk scale
  lib/
    risk-grades.ts        Single source of truth for grades, disclaimer, model version
    demo-mode.ts          Works out Applicant/Analyst view from the URL
    format.ts             Euro and date formatting, shared by every screen
    applications/
      schema.ts           Zod schema: the definition of a valid application
      options.ts          Dropdown choices, shared with the schema
      status.ts           The five application statuses
      reference.ts        Reference-number generation, URL-token checks
      repository.ts       The only file that knows the table's shape
      sample.ts           The "Fill with sample data" example
    supabase/server.ts    Server-only database client
    sample/               Static example data for the landing page
    credit/               Scoring engine: ratios, bands, caps         Day 3
supabase/
  schema.sql              The table. Run once in the Supabase SQL Editor.
  README.md               Manual setup steps
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

- **One table, with typed columns.** The nine financial figures are real `numeric` columns,
  not a JSON blob: they are what the Day 3 scorecard reads and what the Day 4 dashboard
  sorts by, so they get types, CHECK constraints and indexes. No `users`, `documents` or
  `scores` tables exist, because nothing needs them yet.
- **The browser never talks to Supabase.** There is no login, so any Row Level Security
  policy loose enough to let an anonymous applicant read their own application would also
  let anyone read everyone's. Instead RLS is switched on with **no policies at all**, which
  refuses every public key, and the server holds the one key that bypasses it. Every query
  is therefore code in this repository. `src/lib/supabase/server.ts` is marked
  `server-only`, so a build **fails** if that file is ever pulled into the browser bundle.
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
