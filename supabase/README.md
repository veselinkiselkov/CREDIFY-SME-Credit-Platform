# Supabase setup (Day 2)

Everything in this folder is run by hand, once. There is no migration tool in the MVP:
one table, one file, run in the dashboard.

Total time: about five minutes.

---

## 1. Create the project

1. Go to <https://supabase.com/dashboard> and sign in.
2. **New project**.
   - **Name:** `credify`
   - **Database password:** let the dashboard generate one and save it in your password
     manager. You will not need it for Credify (the app connects over the API, not the
     Postgres port), but it cannot be shown again.
   - **Region:** pick the one closest to your Vercel region — `Central EU (Frankfurt)` is
     the right choice for a European deployment.
3. Wait for provisioning to finish (roughly two minutes).

## 2. Create the table and its permissions

1. Open **SQL Editor** in the left sidebar, then **New query**.
2. Open [`schema.sql`](./schema.sql) from this repository, copy the **whole file**, paste it
   into the editor.
3. Press **Run**. You should see `Success. No rows returned`.
4. Check it worked: **Table Editor** → you should see an `applications` table with an
   `RLS enabled` badge next to its name.

> If the badge says **RLS disabled**, stop and re-run the file. Row Level Security with no
> policies is what makes the table unreadable from the public internet.

### Why the file also grants permissions

`schema.sql` does not just create the table. It also grants `service_role` — the role
Credify's secret key authenticates as — `USAGE` on schema `public` and `SELECT`, `INSERT`
and `UPDATE` on `public.applications`. **Without those grants Credify cannot reach its own
table**, and every submission fails with:

```
42501: permission denied for table applications
```

This is because of the Data API setting **"Automatically expose new tables"**. Supabase used
to grant every new table in `public` to `anon`, `authenticated` and `service_role`
automatically; that setting is now **off by default on new projects**, so a table created by
this file starts out reachable by nobody at all — Credify's own key included.

Granting explicitly here is better than switching that setting back on, for three reasons:

- the permissions live in version control next to the table they describe, and show up in a
  diff when they change;
- a fresh project reproduces them exactly, whatever the dashboard toggle happens to say;
- turning the setting on would also expose **every future table** to `anon` and
  `authenticated`, which is the opposite of what this project wants.

**Grants and RLS are two separate gates, and a role must pass both.** A grant decides whether
a role may touch the table at all; RLS decides which rows it then sees. A role with no grant
is refused before RLS is even consulted — which is why "RLS is enabled" on its own says
nothing about who can reach a table.

Credify's arrangement:

| Role | Grants | RLS | Net effect |
|---|---|---|---|
| `service_role` (secret key) | `SELECT`, `INSERT`, `UPDATE` | bypassed (`BYPASSRLS`) | full access, server-side only |
| `anon` (publishable key) | none — explicitly revoked | enabled, no policies | no access |
| `authenticated` | none — explicitly revoked | enabled, no policies | no access |

`DELETE` is deliberately **not** granted. The application never deletes a row: a submission
is a record, and an analyst changes a status rather than removing a case. Withholding it
means neither a bug in the codebase nor a leaked key can destroy submitted applications.

To confirm the grants landed, run this in the SQL Editor:

```sql
select grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_name = 'applications'
  and grantee in ('anon', 'authenticated', 'service_role')
group by grantee order by grantee;
```

You should get exactly one row: `service_role | INSERT, SELECT, UPDATE`. If `anon` or
`authenticated` appears, re-run `schema.sql` — it revokes them.

## 2b. If your project already exists: run migration 001

**Skip this if you have just created the table from `schema.sql` above** — it already has
everything.

If your Supabase project was set up before total liabilities and shareholders' equity were
added, run [`migrations/001_add_liabilities_and_equity.sql`](./migrations/001_add_liabilities_and_equity.sql)
once, the same way: **SQL Editor → New query → paste the whole file → Run**.

**It is additive and safe.** It adds two nullable columns and touches no existing data, so
it cannot fail on rows already in the table, needs no downtime, and re-running it is a no-op.

### Why the change

The credit engine used to *derive* equity as `total assets − interest-bearing debt −
current liabilities`. That is unreliable in both directions:

- interest-bearing debt **overlaps** with current liabilities — the current portion of a
  term loan belongs to both — which understates equity;
- current liabilities **exclude** long-term non-debt items such as provisions, deferred tax
  and lease obligations, which overstates it.

The overstatement is the dangerous one: it makes the negative-equity critical flag fire
**less** often than it should. Both figures are now asked for on the application form and
used directly — for the negative-equity flag, and for the `assets = liabilities + equity`
data-quality check, which could never fail while equity was derived from that same identity.

### After running it

Existing rows keep `NULL` in both columns, because there are no reported figures to put
there and inventing some would recreate the exact problem the change removes. Every new
submission supplies both — the form makes them required.

If your table only holds throwaway test rows, the cleanest thing is to delete them and
re-submit through the form, which gives you genuine reported figures:

```sql
-- see what you would be deleting first
select reference, company_name, submitted_at from public.applications where equity_eur is null;

-- then, if you are happy to lose them
delete from public.applications where equity_eur is null;
```

Confirm the columns landed:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'applications'
  and column_name in ('total_liabilities_eur', 'equity_eur');
```

You should get two rows, both `numeric` and both nullable.

## 3. Copy the two credentials

In **Project Settings**:

| Where | What to copy | Goes into |
|---|---|---|
| **Data API** → Project URL | `https://<project-ref>.supabase.co` | `SUPABASE_URL` |
| **API Keys** → **Publishable and secret API keys** → create or reveal a **secret** key | the `sb_secret_…` string | `SUPABASE_SECRET_KEY` |

Supabase issues two kinds of key, and the difference is the whole security question:

| Key | Prefix | Replaces | Where it may go |
|---|---|---|---|
| Publishable | `sb_publishable_…` | the old `anon` key | safe in a browser — RLS still gates every query |
| **Secret** | `sb_secret_…` | the old `service_role` key | **server only** — it carries Postgres `BYPASSRLS` and skips every policy |

Take the **secret** key. Credify needs no publishable key at all, because the browser never
talks to Supabase.

> **This key bypasses every database rule.** It is a database password. Never commit it,
> never paste it into client-side code or a chat window. If it leaks, revoke it in the
> dashboard and create a new one.
>
> Why Credify uses it at all, and why that is safe here, is explained at the top of
> [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts).

**If your project still shows only the legacy `anon` / `service_role` keys**, the old
`service_role` JWT (a long `eyJ…` string) works in `SUPABASE_SECRET_KEY` exactly the same
way — nothing in the code inspects the format. Supabase is deprecating those legacy keys,
so create a secret key when the option is there.

## 4. Put them in your local environment

From the repository root:

```bash
cp .env.example .env.local
```

Then open `.env.local` and paste the two values in. Restart `npm run dev` afterwards —
Next.js reads environment variables at startup, not per request.

`.env.local` is gitignored. Confirm before you ever commit:

```bash
git check-ignore .env.local   # must print: .env.local
git status --short            # .env.local must NOT appear
```

## 5. Put them in Vercel

Vercel does not read `.env.local`; it has its own store.

1. Vercel dashboard → your project → **Settings** → **Environment Variables**.
2. Add both, ticking **Production**, **Preview** and **Development**:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` — mark this one **Sensitive** so it cannot be read back
     out of the dashboard.
3. **Redeploy.** Environment variables are baked in at build time, so an existing
   deployment will not pick them up on its own.

---

## Testing the analyst side before the analyst screens exist

The analyst dashboard is Day 4. Until then, change a status by hand to see the applicant's
status page react — this is the main way to test Day 2.

**Table Editor** → `applications` → click a row and edit:

- `status` → one of `submitted`, `in_review`, `information_requested`, `approved`,
  `declined` (anything else is refused by the CHECK constraint)
- `analyst_message` → a sentence written for the borrower, or leave it empty

Save, then reload `/status/<access_token>`. `updated_at` is maintained by a trigger, so the
"last updated" line on the page moves on its own.

To get the link for a row: copy its `access_token` and open
`http://localhost:3000/status/<access_token>`.

## If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| `42501: permission denied for table applications` | The grants did not run, or the table was recreated by hand afterwards. | Re-run `schema.sql`. |
| `relation "public.applications" does not exist` | `schema.sql` was never run, or was run against a different project. | Check you are in the right project, then run it. |
| `column "equity_eur" of relation "applications" does not exist` | The project predates the balance-sheet change. | Run `migrations/001_add_liabilities_and_equity.sql` (section 2b). |
| Submitting shows "the application database is not connected" | `SUPABASE_URL` / `SUPABASE_SECRET_KEY` are missing from the running process. | Locally: check `.env.local` and restart `npm run dev`. On Vercel: add them, then **redeploy**. |
| `Invalid API key` | A publishable key, or a key from another project, is in `SUPABASE_SECRET_KEY`. | Use the `sb_secret_…` key from this project. |

## Starting over

```sql
drop table if exists public.applications cascade;
drop function if exists public.set_updated_at();
```

Then re-run `schema.sql`.
