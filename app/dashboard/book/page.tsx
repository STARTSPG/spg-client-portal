"use client";

import Link from "next/link";
import { useEffect } from "react";

const CAL_LINK = "startspg/weekly-check-in-call";
const EMBED_SRC = "https://cal.eu/embed.js";
const NAMESPACE = "weekly-check-in-call";

declare global {
  interface Window {
    Cal?: {
      (action: string, ...args: unknown[]): void;
      ns?: Record<string, (action: string, ...args: unknown[]) => void>;
      loaded?: boolean;
      q?: unknown[];
    };
  }
}

export default function BookPage() {
  useEffect(() => {
    // Standard Cal.com embed bootstrap (adapted from their snippet).
    (function (C: Window, A: string, L: string) {
      const p = function (a: typeof C.Cal, ar: unknown[]) {
        a!.q!.push(ar);
      };
      const d = C.document;
      C.Cal =
        C.Cal ||
        Object.assign(
          function (...args: unknown[]) {
            const cal = C.Cal!;
            const ar = args;
            if (!cal.loaded) {
              cal.ns = {};
              cal.q = cal.q || [];
              const script = d.createElement("script");
              script.src = A;
              d.head.appendChild(script);
              cal.loaded = true;
            }
            if (ar[0] === L) {
              const api = function (...a: unknown[]) {
                p(api as unknown as typeof C.Cal, a);
              } as unknown as typeof C.Cal;
              const namespace = ar[1] as string;
              (api as unknown as { q: unknown[] }).q =
                (api as unknown as { q: unknown[] }).q || [];
              if (typeof namespace === "string") {
                cal.ns![namespace] = cal.ns![namespace] || (api as never);
                p(cal.ns![namespace] as unknown as typeof C.Cal, ar);
                p(api as unknown as typeof C.Cal, ar);
              } else {
                p(api as unknown as typeof C.Cal, ar);
              }
              return;
            }
            p(cal, ar);
          },
          { q: [], ns: {}, loaded: false },
        );
    })(window, EMBED_SRC, "init");

    window.Cal!("init", NAMESPACE, { origin: "https://cal.eu" });
    window.Cal!.ns![NAMESPACE]("inline", {
      elementOrSelector: "#cal-inline",
      calLink: CAL_LINK,
      layout: "month_view",
      config: { calOrigin: "https://cal.eu" },
    });
    window.Cal!.ns![NAMESPACE]("ui", {
      hideEventTypeDetails: false,
      layout: "month_view",
    });
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="text-sm text-neutral-600 hover:text-neutral-900"
      >
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Book your weekly call</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Pick a time that works for you.
      </p>

      <div
        id="cal-inline"
        className="mt-6 min-h-[600px] w-full overflow-hidden rounded-lg border border-neutral-200 bg-white"
      />
    </main>
  );
}
