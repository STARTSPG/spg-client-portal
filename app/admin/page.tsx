import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "client")
    .order("full_name", { ascending: true, nullsFirst: false });

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Coach dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {clients?.length ?? 0} client{clients?.length === 1 ? "" : "s"}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-md border px-3 py-1.5 text-sm">
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Clients
        </h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {clients?.map((c) => (
            <li key={c.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{c.full_name || "(no name)"}</p>
                <p className="text-sm text-neutral-500">{c.email}</p>
              </div>
              <Link
                href={`/admin/clients/${c.id}`}
                className="text-sm font-medium text-neutral-900 underline"
              >
                Manage →
              </Link>
            </li>
          ))}
          {!clients?.length && (
            <li className="p-4 text-sm text-neutral-600">No clients yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
