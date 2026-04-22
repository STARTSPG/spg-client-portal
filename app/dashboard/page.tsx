import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ClientDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: todaysSession }, { data: latestUpdate }] =
    await Promise.all([
      supabase
        .from("users")
        .select("full_name, email")
        .eq("id", user!.id)
        .single(),
      supabase
        .from("sessions")
        .select("id, title, notes, scheduled_date, programs!inner(client_id, title)")
        .eq("programs.client_id", user!.id)
        .eq("scheduled_date", today)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("weekly_updates")
        .select("id, week_start, summary, adjustments, created_at")
        .eq("client_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const displayName =
    profile?.full_name?.trim() || profile?.email?.split("@")[0] || "there";

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {displayName}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Here's what's on for today.
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-md border px-3 py-1.5 text-sm">
            Sign out
          </button>
        </form>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Today's session
        </h2>
        {todaysSession ? (
          <div className="mt-3 space-y-1">
            <p className="text-lg font-medium">{todaysSession.title}</p>
            {todaysSession.notes && (
              <p className="text-sm text-neutral-600">{todaysSession.notes}</p>
            )}
            <Link
              href={`/sessions/${todaysSession.id}`}
              className="mt-2 inline-block text-sm font-medium text-neutral-900 underline"
            >
              View session →
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">
            No session scheduled for today. Enjoy your rest day.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Latest update from your coach
        </h2>
        {latestUpdate ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-neutral-500">
              Week of{" "}
              {new Date(latestUpdate.week_start).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {latestUpdate.summary && (
              <p className="text-sm text-neutral-800 whitespace-pre-line">
                {latestUpdate.summary}
              </p>
            )}
            {latestUpdate.adjustments && (
              <div className="mt-2 rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
                <span className="font-medium">Adjustments: </span>
                {latestUpdate.adjustments}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">
            No updates yet from your coach.
          </p>
        )}

        <Link
          href="/dashboard/check-in"
          className="mt-4 inline-block text-sm font-medium text-neutral-900 underline"
        >
          Submit this week's check-in →
        </Link>
      </section>

      <section>
        <Link
          href="/dashboard/book"
          className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Book your call
        </Link>
      </section>
    </main>
  );
}
