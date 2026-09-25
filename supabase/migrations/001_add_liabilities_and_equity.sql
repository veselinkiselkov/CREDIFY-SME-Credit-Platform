-- =====================================================================================
-- MIGRATION 001: report total liabilities and shareholders' equity
--
-- Run this ONCE, in the Supabase SQL Editor, on a project that already has an
-- `applications` table. A project created from scratch with the current schema.sql
-- already has these columns and does not need this file.
--
-- WHY
-- The credit engine used to derive equity as
--     total assets − interest-bearing debt − current liabilities
-- That is unreliable in both directions. Interest-bearing debt can overlap with current
-- liabilities (the current portion of a term loan belongs to both), which understates
-- equity; and current liabilities exclude long-term non-debt items - provisions, deferred
-- tax, lease obligations - which overstates it. The overstatement is the dangerous one: it
-- makes the negative-equity critical flag fire LESS often than it should.
--
-- Both figures are now collected from the applicant and used directly, for the
-- negative-equity flag and for the assets = liabilities + equity data-quality check.
--
-- SAFETY
-- Additive only. It adds two nullable columns and touches no existing data, so it cannot
-- fail on rows already in the table and needs no downtime. Re-running it is a no-op.
-- =====================================================================================

alter table public.applications
  add column if not exists total_liabilities_eur numeric(14,2),
  add column if not exists equity_eur            numeric(14,2);

-- Refuse negative total liabilities, the same way the other balance-sheet columns do.
-- Equity deliberately has NO constraint: negative equity is a real and important state.
--
-- Added separately and guarded, because ADD CONSTRAINT has no IF NOT EXISTS in Postgres 15
-- and would fail on a second run.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.applications'::regclass
      and conname = 'applications_total_liabilities_eur_check'
  ) then
    alter table public.applications
      add constraint applications_total_liabilities_eur_check
      check (total_liabilities_eur is null or total_liabilities_eur >= 0);
  end if;
end;
$$;

-- -------------------------------------------------------------------------------------
-- The columns stay NULLABLE on purpose.
--
-- Rows submitted before this migration have no figures to put in them, and inventing some
-- would be worse than leaving them empty: a derived value that looks reported is exactly
-- the problem this migration exists to remove. Every NEW submission supplies both, because
-- the application form makes them required fields.
--
-- The Day 4 analyst screens must therefore treat a row with a NULL equity_eur as
-- incomplete and say so, rather than scoring it.
--
-- OPTIONAL: if your table only holds throwaway test rows, the cleanest thing is to delete
-- them and re-submit through the form, which gives you real reported figures:
--
--     delete from public.applications where equity_eur is null;
--
-- Check what you would be deleting first:
--
--     select reference, company_name, submitted_at from public.applications
--     where equity_eur is null;
-- -------------------------------------------------------------------------------------
