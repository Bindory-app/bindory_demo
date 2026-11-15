import { Check, Pencil } from "lucide-react";
import { proposalTitle, type ProposalPayload } from "@/lib/mori-tools";

export function ConfirmCard({ payload, onConfirm, onEdit, working }: { payload: ProposalPayload; onConfirm: () => void; onEdit: () => void; working: boolean }) {
  const p = payload;
  const cards = p.tool === "create_binder" ? p.cards : p.tool === "save_memory" ? (p.card ? [p.card] : []) : [p.card];
  return (
    <div className="w-full max-w-[92%] rounded-3xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Please confirm</p>
      <p className="mt-1 font-bold">{proposalTitle(p)}</p>
      {p.tool === "save_memory" && (
        <dl className="mt-2 space-y-1 text-sm">
          <p className="text-muted-foreground">{p.story}</p>
          {p.place && <p><span className="font-semibold">Where:</span> {p.place}</p>}
          {p.with_whom && <p><span className="font-semibold">With:</span> {p.with_whom}</p>}
          {p.date && <p><span className="font-semibold">When:</span> {p.date}</p>}
          {p.photo_path && <p><span className="font-semibold">Photo:</span> attached</p>}
          <p className="text-xs text-muted-foreground">Saved privately. Only you can see it.</p>
        </dl>
      )}
      {p.tool === "create_binder" && p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
      {cards.length > 0 && (
        <ul className="mt-3 space-y-2">
          {cards.map((c) => (
            <li key={c.tcgdex_id} className="flex items-center gap-3">
              {c.image ? <img src={c.image} alt={c.name} className="h-14 w-10 shrink-0 rounded object-contain" /> : <div className="h-14 w-10 shrink-0 rounded bg-muted" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.reason ?? c.set_name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {p.status === "pending" ? (
        <div className="mt-4 flex gap-2">
          <button disabled={working} onClick={onConfirm} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"><Check className="h-4 w-4" />Confirm</button>
          <button disabled={working} onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-sm font-bold"><Pencil className="h-4 w-4" />Edit</button>
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-muted-foreground">{p.status === "confirmed" ? "Confirmed" : "Editing"}</p>
      )}
    </div>
  );
}
