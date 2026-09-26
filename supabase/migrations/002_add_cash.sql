-- =====================================================================================
-- MIGRATION 002: collect cash and cash equivalents
--
-- Run this ONCE, in the Supabase SQL Editor, on a project that already has an
-- `applications` table. A project created from scratch with the current schema.sql
-- already has this column and does not need this file.
--
-- WHY
-- Cash is a component of current assets. Collecting it lets the credit engine run its
-- "cash exceeds current assets" data-quality check - which could not run at all while the
-- figure was never asked for - and lets an analyst see how much of a borrower's liquidity
-- is actual cash rather than stock and receivables.
--
-- Cash is NOT scored. The scorecard's liquidity factor uses the current ratio, and adding
-- cash as a separate scored factor would count the same asset twice.
--
-- SAFETY
-- Additive only. It adds one nullable column and touches no existing data, so it cannot
-- fail on rows already in the table and needs no downtime. Re-running it is a no-op.
--
-- Unlike migration 001, a null here does NOT make an application unscoreable: the engine
-- never uses cash, so existing rows keep scoring exactly as they do today and only the
-- cash check goes unrun for them.
-- =====================================================================================

alter table public.applications
  add column if not exists cash_eur numeric(14,2);

-- Cash cannot be negative. Guarded because ADD CONSTRAINT has no IF NOT EXISTS in
-- Postgres 15 and would fail on a second run. The constraint permits NULL, which is what
-- rows submitted before this migration carry.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.applications'::regclass
      and conname = 'applications_cash_eur_check'
  ) then
    alter table public.applications
      add constraint applications_cash_eur_check
      check (cash_eur is null or cash_eur >= 0);
  end if;
end;
$$;

-- -------------------------------------------------------------------------------------
-- The column stays NULLABLE on purpose.
--
-- Rows submitted before this migration have no cash figure, and inventing one - a
-- percentage of current assets, say - would be exactly the kind of fabricated input the
-- analyst screens are built to refuse. Every NEW submission supplies it, because the
-- application form makes it a required field.
--
-- The analyst borrower page shows "Not reported" for such a row and carries on.
--
-- To see which rows predate this change:
--
--     select reference, company_name, submitted_at from public.applications
--     where cash_eur is null;
-- -------------------------------------------------------------------------------------
