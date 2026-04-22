import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function createProgram(clientId: string, formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = (formData.get("title") as string).trim();
  const start_date = (formData.get("start_date") as string) || null;
  if (!title) return;

  const { error } = await supabase.from("programs").insert({
    client_id: clientId,
    coach_id: user.id,
    title,
    start_date,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clients/${clientId}`);
}

async function createWeeklyUpdate(clientId: string, formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const week_start = formData.get("week_start") as string;
  const summary = ((formData.get("summary") as string) || "").trim() || null;
  const adjustments =
    ((formData.get("adjustments") as string) || "").trim() || null;
  if (!week_start) return;

  const { error } = await supabase.from("weekly_updates").insert({
    client_id: clientId,
    coach_id: user.id,
    week_start,
    summary,
    adjustments,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clients/${clientId}`);
}

export default async function ClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .eq("id", id)
    .maybeSingle();

  if (!client || client.role !== "client") notFound();

  const [{ data: programs }, { data: updates }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, title, start_date, end_date, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("weekly_updates")
      .select("id, week_start, summary, adjustments, created_at")
      .eq("client_id", id)
      .order("week_start", { ascending: false }),
  ]);

  const createProgramAction = createProgram.bind(null, id);
  const createWeeklyUpdateAction = createWeeklyUpdate.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link href="/admin" className="text-sm text-neutral-600 hover:text-neutral-900">
        ← Back to clients
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold">
          {client.full_name || "(no name)"}
        </h1>
        <p className="text-sm text-neutral-500">{client.email}</p>
      </header>

      {/* Create program */}
      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          New program
        </h2>
        <form action={createProgramAction} className="mt-3 space-y-3">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Program name
            </label>
            <input
              id="title"
              name="title"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="start_date" className="mb-1 block text-sm font-medium">
              Start date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Create program
          </button>
        </form>
      </section>

      {/* Programs list */}
      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Programs
        </h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {programs?.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-neutral-500">
                  {p.start_date ? `Starts ${p.start_date}` : "No start date"}
                </p>
              </div>
              <Link
                href={`/admin/clients/${id}/programs/${p.id}/sessions/new`}
                className="text-sm font-medium text-neutral-900 underline"
              >
                Add session →
              </Link>
            </li>
          ))}
          {!programs?.length && (
            <li className="p-4 text-sm text-neutral-600">No programs yet.</li>
          )}
        </ul>
      </section>

      {/* Weekly update */}
      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Post weekly update
        </h2>
        <form action={createWeeklyUpdateAction} className="mt-3 space-y-3">
          <div>
            <label htmlFor="week_start" className="mb-1 block text-sm font-medium">
              Week start
            </label>
            <input
              id="week_start"
              name="week_start"
              type="date"
              required
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="summary" className="mb-1 block text-sm font-medium">
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="adjustments" className="mb-1 block text-sm font-medium">
              Adjustments
            </label>
            <textarea
              id="adjustments"
              name="adjustments"
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Post update
          </button>
        </form>

        {updates?.length ? (
          <ul className="mt-5 space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="rounded-md border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Week of {u.week_start}</p>
                {u.summary && <p className="mt-1 text-sm whitespace-pre-line">{u.summary}</p>}
                {u.adjustments && (
                  <p className="mt-1 text-sm text-neutral-700">
                    <span className="font-medium">Adjustments: </span>
                    {u.adjustments}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
