import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Confirm or edit a Mori proposal from the wireframe front end (bearer-authenticated, RLS applies). */
export const Route = createFileRoute("/api/mori-confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin)
          return new Response("Forbidden", { status: 403 });
        const token = request.headers.get("authorization");
        if (!token?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return new Response("Unavailable", { status: 503 });
        const db = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: token } },
        });
        const { data: auth, error } = await db.auth.getUser(token.slice(7));
        if (error || !auth.user) return new Response("Unauthorized", { status: 401 });
        const body: unknown = await request.json().catch(() => null);
        const messageId =
          body && typeof body === "object" && "messageId" in body ? String(body.messageId) : "";
        const action =
          body && typeof body === "object" && "action" in body ? String(body.action) : "";
        if (!/^[0-9a-f-]{36}$/i.test(messageId) || (action !== "confirm" && action !== "edit"))
          return new Response("Invalid confirmation", { status: 400 });
        try {
          const { confirmWith } = await import("@/lib/mori-confirm.server");
          return Response.json(await confirmWith(db, messageId, action));
        } catch {
          return new Response("Could not confirm", { status: 500 });
        }
      },
    },
  },
});
