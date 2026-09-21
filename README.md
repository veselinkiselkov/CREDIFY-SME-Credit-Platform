# Credify

An SME credit decisioning platform, built as a portfolio project.

A small business applies for a loan. Credify calculates credit ratios and a transparent, rule-based risk score. A bank credit analyst reviews the analysis and makes the decision.

> **Model scope.** Credify's scorecard is an illustrative decision-support model built for demonstration. It is not a real bank underwriting model. It never approves or rejects an application: a credit analyst reviews every case and makes the final decision. All companies and figures are fictional.

## Run it locally

Requires Node.js 20.9 or newer.

```bash
npm install      # download dependencies (first time only)
npm run dev      # start the development server at http://localhost:3000
npm run build    # check that the production build succeeds before pushing
```

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) with TypeScript |
| Styling | Tailwind CSS v4, components in the shadcn/ui pattern |
| Database | Supabase Postgres (from Day 2) |
| Hosting | Vercel, deployed automatically from GitHub |

## Project structure

```
src/
  app/                    Pages. The folder path is the web address.
    layout.tsx            Wraps every page: fonts, header, footer
    globals.css           Design tokens (colours, fonts, radius)
    page.tsx              Landing page  (/)
    apply/                Loan application  (/apply)          Day 2
    analyst/              Analyst dashboard  (/analyst)       Day 4
    methodology/          Scoring methodology  (/methodology) Day 5
  components/
    layout/               Header, footer, logo, demo-mode switch
    landing/              Landing page sections
    ui/                   Generic building blocks (button)
    risk-badge.tsx        Grade badge used across the app
    risk-scale.tsx        The 0-100 risk scale
  lib/
    risk-grades.ts        Single source of truth for grades, disclaimer, model version
    demo-mode.ts          Works out Applicant/Analyst view from the URL
    sample/               Static example data for the landing page
    credit/               Scoring engine: ratios, bands, caps         Day 3
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
