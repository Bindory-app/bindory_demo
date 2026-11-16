import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ownMessagePhotos } from "@/lib/mori-validation";

export const Route = createFileRoute("/api/mori-chat")({
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
        if (!url || !key) return new Response("Chat is unavailable", { status: 503 });
        const db = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: token } },
        });
        const { data: auth, error } = await db.auth.getUser(token.slice(7));
        if (error || !auth.user) return new Response("Unauthorized", { status: 401 });
        const body: unknown = await request.json().catch(() => null);
        if (
          !body ||
          typeof body !== "object" ||
          !("message" in body) ||
          typeof body.message !== "string" ||
          !body.message.trim() ||
          body.message.length > 2000
        )
          return new Response("Invalid message", { status: 400 });
        const message = body.message.trim();
        const userId = auth.user.id;
        if (!ownMessagePhotos(message, userId, "photo_path" in body ? body.photo_path : undefined))
          return new Response("Photo must belong to you", { status: 403 });
        const encoder = new TextEncoder();
        const abort = new AbortController();
        request.signal.addEventListener("abort", () => abort.abort(), { once: true });
        const { runMori } = await import("@/lib/mori-agent.server");
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const emit = (event: unknown) => {
              if (!abort.signal.aborted)
                controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            };
            // On Vercel each request carries a short-lived OIDC token that AI Gateway accepts directly.
            const oidcToken = request.headers.get("x-vercel-oidc-token");
            void runMori(db, userId, message, emit, abort.signal, oidcToken)
              .catch((error) => {
                console.error(
                  "Mori chat failed",
                  error instanceof Error ? error.message : "Unknown error",
                );
                emit({ type: "error", text: "I could not finish that request. Please try again." });
              })
              .finally(() => {
                if (!abort.signal.aborted) controller.close();
              });
          },
          cancel() {
            abort.abort();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
