import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// YYYYWW — e.g. week 17 of 2026 → 202617. ISO week.
function weekCode(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return date.getUTCFullYear() * 100 + week;
}

async function submitCheckIn(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const payload = {
    client_id: user.id,
    week_number: weekCode(),
    energy_rating: Number(formData.get("energy")),
    adherence_rating: Number(formData.get("adherence")),
    mood_rating: Number(formData.get("mood")),
    notes: ((formData.get("notes") as string | null) ?? "").trim() || null,
  };

  const { error } = await supabase.from("check_ins").insert(payload);
  // 23505 = unique_violation → row for this week already exists; treat as success.
  if (error && error.code !== "23505") throw new Error(error.message);

  revalidatePath("/dashboard/check-in");
  redirect("/dashboard/check-in?submitted=1");
}

const SCALE = [1, 2, 3, 4, 5] as const;

function Scale({ name, value }: { name: string; value?: number | null }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={name}>
      {SCALE.map((n) => (
        <label
          key={n}
          className="flex-1 cursor-pointer select-none rounded-md border border-neutral-300 bg-white py-2 text-center text-sm font-medium text-neutral-700 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-900 has-[:checked]:text-white"
        >
          <input
            type="radio"
            name={name}
            value={n}
            defaultChecked={value === n}
            required={value === undefined}
            className="sr-only"
          />
          {n}
        </label>
      ))}
    </div>
  );
}

function ReadOnlyScale({ value }: { value: number | null }) {
  return (
    <div className="flex gap-2">
      {SCALE.map((n) => (
        <div
          key={n}
          className={`flex-1 rounded-md border py-2 text-center text-sm font-medium ${
            value === n
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 bg-white text-neutral-400"
          }`}
        >
          {n}
        </div>
      ))}
    </div>
  );
}

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("check_ins")
    .select(
      "energy_rating, adherence_rating, mood_rating, notes, submitted_at",
    )
    .eq("client_id", user!.id)
    .eq("week_number", weekCode())
    .maybeSingle();

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="text-sm text-neutral-600 hover:text-neutral-900"
      >
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">This week's check-in</h1>

      {submitted && !existing && (
        <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Check-in submitted. Nice work.
        </p>
      )}

      {existing ? (
        <div className="mt-6 space-y-5">
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            You've already submitted this week's check-in on{" "}
            {new Date(existing.submitted_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
            .
          </p>

          <div>
            <p className="mb-2 text-sm font-medium">Energy</p>
            <ReadOnlyScale value={existing.energy_rating} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Adherence</p>
            <ReadOnlyScale value={existing.adherence_rating} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Mood</p>
            <ReadOnlyScale value={existing.mood_rating} />
          </div>
          {existing.notes && (
            <div>
              <p className="mb-2 text-sm font-medium">Notes</p>
              <p className="whitespace-pre-line rounded-md border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
                {existing.notes}
              </p>
            </div>
          )}
        </div>
      ) : (
        <form action={submitCheckIn} className="mt-6 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Energy this week
            </label>
            <Scale name="energy" />
            <p className="mt-1 text-xs text-neutral-500">1 = drained · 5 = buzzing</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Adherence to your program
            </label>
            <Scale name="adherence" />
            <p className="mt-1 text-xs text-neutral-500">1 = barely · 5 = every session</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Mood</label>
            <Scale name="mood" />
            <p className="mt-1 text-xs text-neutral-500">1 = low · 5 = great</p>
          </div>

          <div>
            <label htmlFor="notes" className="mb-2 block text-sm font-medium">
              Notes <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              placeholder="Anything your coach should know?"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Submit check-in
          </button>
        </form>
      )}
    </main>
  );
}
