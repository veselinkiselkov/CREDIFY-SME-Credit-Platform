import { Container } from "@/components/layout/container";

/**
 * Shown when SUPABASE_URL / SUPABASE_SECRET_KEY are missing.
 *
 * Without this, a deployment with no database configured would throw on a server component
 * and render a blank error page. An honest "not connected yet" panel is better for a demo,
 * and it keeps the rest of the site (landing page, methodology) working with no Supabase
 * project at all, which is how Day 1 stays deployable.
 *
 * The message deliberately names the two variables but neither of their values.
 */
export function NotConnectedNotice() {
  return (
    <Container className="max-w-2xl py-24">
      <p className="text-sm text-muted-foreground">Configuration</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">The application database is not connected</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Credify stores applications in Supabase, and this environment has no credentials for it yet. Applications
        cannot be submitted or looked up until that is set up.
      </p>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        If this is your deployment: add <code className="rounded bg-muted px-1.5 py-0.5 text-sm">SUPABASE_URL</code> and{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">SUPABASE_SECRET_KEY</code>, then redeploy. The
        steps are in <code className="rounded bg-muted px-1.5 py-0.5 text-sm">supabase/README.md</code>.
      </p>
    </Container>
  );
}
