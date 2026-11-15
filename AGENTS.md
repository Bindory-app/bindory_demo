<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Brand tokens and phone shell live in src/styles.css and src/components/AppShell.tsx; signed-in pages wrap in AppShell; Ask Mori at / renders its own shell and shows the bottom bar only when signed in.
- Guest actions on / save the request (src/lib/pending-intent.ts) and open AuthSheet; after sign-in the saved request is replayed so the conversation continues.
- All user tables are owner-only via RLS on user_id = auth.uid(); profiles row is created by a trigger on auth.users.
- Mori chat runs in TanStack server functions (src/lib/mori.functions.ts) via the Lovable AI Gateway with tool calls, not Supabase Edge Functions; writing tools only create a pending confirm message and data is written by confirmProposal after the user taps Confirm.
- Points are awarded by database triggers on cards/memories inserts; clients cannot insert points_events.
- New-user onboarding runs inside the Ask Mori chat (steps in src/lib/onboarding.ts); profiles.onboarded_at decides whether it runs, and the bottom bar stays hidden until it finishes.
- All card lookups go through src/lib/tcgdex.ts (TCGdex search + detail); images are hotlinked via cardImage() and never stored.
