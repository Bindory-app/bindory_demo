import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { MoriRow } from "./mori-tools";
export type { MoriStreamEvent, MoriRow } from "./mori-tools";

export const sendToMori = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string }) => {
    const message = String(input.message ?? "")
      .trim()
      .slice(0, 2000);
    if (!message) throw new Error("Empty message");
    return { message };
  })
  .handler(async ({ data, context }) => {
    const { runMori } = await import("./mori-agent.server");
    return runMori(context.supabase, context.userId, data.message);
  });

export const confirmProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messageId: string; action: "confirm" | "edit" }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.messageId) || !["confirm", "edit"].includes(input.action))
      throw new Error("Invalid confirmation");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { confirmWith } = await import("./mori-confirm.server");
    return confirmWith(context.supabase, data.messageId, data.action);
  });

export const loadMoriHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows: MoriRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const page = await context.supabase
        .from("mori_messages")
        .select("id, role, kind, content, payload")
        .order("created_at")
        .order("id")
        .range(offset, offset + 499);
      if (page.error) throw page.error;
      rows.push(...page.data);
      if (page.data.length < 500) break;
    }
    return rows;
  });
