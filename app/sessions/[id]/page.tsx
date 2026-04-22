import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // !inner ensures the join filter acts as a WHERE — rows where the
  // program's client_id doesn't match auth user are excluded entirely.
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, title, notes, scheduled_date, programs!inner(client_id, title)",
    )
    .eq("id", id)
    .eq("programs.client_id", user!.id)
    .maybeSingle();

  if (!session) notFound();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, sets, reps, rest_seconds, video_url, notes, position")
    .eq("session_id", id)
    .order("position", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="text-sm text-neutral-600 hover:text-neutral-900"
      >
        ← Back to dashboard
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold">{session.title}</h1>
        {session.scheduled_date && (
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(session.scheduled_date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
        {session.notes && (
          <p className="mt-3 whitespace-pre-line text-sm text-neutral-700">
            {session.notes}
          </p>
        )}
      </header>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Exercises
        </h2>

        {!exercises?.length && (
          <p className="text-sm text-neutral-600">
            No exercises listed for this session.
          </p>
        )}

        <ul className="space-y-3">
          {exercises?.map((ex) => (
            <li
              key={ex.id}
              className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <p className="text-base font-medium">{ex.name}</p>

              <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Sets</dt>
                  <dd>{ex.sets ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Reps</dt>
                  <dd>{ex.reps ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Rest</dt>
                  <dd>
                    {ex.rest_seconds ? `${ex.rest_seconds}s` : "—"}
                  </dd>
                </div>
              </dl>

              {ex.notes && (
                <p className="mt-2 text-sm text-neutral-600">{ex.notes}</p>
              )}

              {ex.video_url && (
                <a
                  href={ex.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-neutral-900 underline"
                >
                  Watch demo
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
