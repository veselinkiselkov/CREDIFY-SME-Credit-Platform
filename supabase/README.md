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

## 2. Create the table

1. Open **SQL Editor** in the left sidebar, then **New query**.
2. Open [`schema.sql`](./schema.sql) from this repository, copy the **whole file**, paste it
   into the editor.
3. Press **Run**. You should see `Success. No rows returned`.
4. Check it worked: **Table Editor** → you should see an `applications` table with an
   `RLS enabled` badge next to its name.

> If the badge says **RLS disabled**, stop and re-run the file. Row Level Security with no
> policies is what makes the table unreadable from the public internet.

## 3. Copy the two credentials

In **Project Settings**:

| Where | What to copy | Goes into |
|---|---|---|
| **Data API** → Project URL | `https://<project-ref>.supabase.co` | `SUPABASE_URL` |
| **API Keys** → `service_role` (click **Reveal**) | the long `eyJ...` string | `SUPABASE_SERVICE_ROLE_KEY` |

Take the **`service_role`** key, not the `anon` / publishable one.

> **This key bypasses every database rule.** It is a database password. Never commit it,
> never paste it into client-side code or a chat window. If it leaks, rotate it in the
> dashboard — the old one stops working immediately.
>
> Why Credify uses it at all, and why that is safe here, is explained at the top of
> [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts).

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
   - `SUPABASE_SERVICE_ROLE_KEY` — mark this one **Sensitive** so it cannot be read back
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

## Starting over

```sql
drop table if exists public.applications cascade;
drop function if exists public.set_updated_at();
```

Then re-run `schema.sql`.
