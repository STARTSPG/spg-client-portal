import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function createSession(
  clientId: string,
  programId: string,
  formData: FormData,
) {
  "use server";
  const supabase = await createClient();

  const title = (formData.get("title") as string).trim();
  const scheduled_date = (formData.get("scheduled_date") as string) || null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  if (!title) return;

  const { error } = await supabase.from("sessions").insert({
    program_id: programId,
    title,
    scheduled_date,
    notes,
  });
  if (error) throw new Error(error.message);

  redirect(`/admin/clients/${clientId}`);
}

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string; programId: string }>;
}) {
  const { id, programId } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("id, title, client_id")
    .eq("id", programId)
    .eq("client_id", id)
    .maybeSingle();

  if (!program) notFound();

  const action = createSession.bind(null, id, programId);

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:py-8">
      <Link
        href={`/admin/clients/${id}`}
        className="text-sm text-neutral-600 hover:text-neutral-900"
      >
        ← Back to client
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">New session</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Program: <span className="font-medium">{program.title}</span>
      </p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="scheduled_date" className="mb-1 block text-sm font-medium">
            Scheduled date
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Create session
        </button>
      </form>
    </main>
  );
}
