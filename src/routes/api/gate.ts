import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Checks the demo password, records the tester's email, and sets the signed gate cookie. */
export const Route = createFileRoute("/api/gate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin)
          return new Response("Forbidden", { status: 403 });
        const { passwordOk, gateCookie } = await import("@/lib/gate.server");
        const body: unknown = await request.json().catch(() => null);
        const email =
          body && typeof body === "object" && "email" in body
            ? String(body.email).trim().slice(0, 254)
            : "";
        const password =
          body && typeof body === "object" && "password" in body ? String(body.password) : "";
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
          return new Response("Invalid email", { status: 400 });
        if (!passwordOk(password)) return new Response("Wrong password", { status: 401 });

        // Record who tested the demo (insert-only table; never readable through the API).
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (url && key) {
          const db = createClient<Database>(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const ua = (request.headers.get("user-agent") || "").slice(0, 400);
          const { error } = await db
            .from("demo_testers" as never)
            .insert({ email: email.toLowerCase(), user_agent: ua } as never);
          if (error) console.error("Could not record demo tester", error.message);
        }
        return new Response(null, {
          status: 204,
          headers: { "Set-Cookie": gateCookie(email.toLowerCase()) },
        });
      },
    },
  },
});
