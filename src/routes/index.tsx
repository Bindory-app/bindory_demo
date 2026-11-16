import { createFileRoute } from "@tanstack/react-router";

/**
 * demo.bindory.app: the private demo. Without a valid gate cookie this returns the password
 * page; with one, it returns the Bindory wireframe app (built by scripts/build-wireframe.py).
 */
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { hasValidGate, GATE_PAGE } = await import("@/lib/gate.server");
        const headers = {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex",
        };
        if (!hasValidGate(request)) return new Response(GATE_PAGE, { headers });
        const { default: html } = await import("@/lib/wireframe-html.server");
        return new Response(html, { headers });
      },
    },
  },
});
