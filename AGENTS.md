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
- Mori's server-only agent runs through the Lovable AI Gateway; authenticated RPCs handle history and confirmation, while /api/mori-chat verifies the bearer and streams native events as NDJSON for live chat updates.
- Points are awarded by database triggers on cards/memories inserts; clients cannot insert points_events.
- New-user onboarding runs inside the Ask Mori chat (steps in src/lib/onboarding.ts); profiles.onboarded_at decides whether it runs, and the bottom bar stays hidden until it finishes.
- All card lookups go through src/lib/tcgdex.ts (TCGdex search + detail); images are hotlinked via cardImage() and never stored.
- Home event destinations have dedicated routes; unavailable public showcase data renders an honest empty state rather than invented collectors.
- Home progress uses owner-scoped collection and binder membership reads; daily prompt rotation and dismissal keys live in a shared browser-safe helper for deterministic testing.
- Home uses an opt-in AppShell presentation and an Embla event carousel; other screens keep their existing shell and navigation presentation.
- Mori confirmation uses a SECURITY INVOKER database function with a locked proposal row and one transaction; binder creation uses owned cards only so suggestions never become invented ownership.
- Mori UI composes AI Elements conversation, message, tool and composer primitives; assistant borders intentionally match the supplied chat references.
- Collection tabs read only owner-scoped live rows; shared browser-safe helpers govern card pagination and session notices, while collection changes go through Mori confirmation.
- Grail slots must remain empty until explicit grail selections and real slab-photo data exist; ordinary card images must not be presented as slab photos.
- Mori initialization keys on user identity rather than session tokens; profile failures are retryable and onboarding saves upsert the owned profile before entering chat.
- Photo ownership is validated at the chat boundary and memory proposal, with private storage policies restricting every operation to the owner's first path segment.
