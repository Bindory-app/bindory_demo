import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BinderCover } from "./BinderPages";
import { createBinderPreview } from "@/lib/binders.functions";
import type { ProposalPayload } from "@/lib/mori-tools";

export function BinderPreview({
  payload,
  messageId,
  working,
}: {
  payload: Extract<ProposalPayload, { tool: "create_binder" }>;
  messageId: string;
  working: boolean;
}) {
  const [name, setName] = useState(payload.name);
  const [rename, setRename] = useState(false);
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const create = useServerFn(createBinderPreview);
  const navigate = useNavigate();
  const cards = payload.cards.map((c, position) => ({
    id: c.tcgdex_id,
    name: c.name,
    image_url: c.image ?? null,
    reason: c.reason ?? null,
    position,
  }));
  const save = async (isPublic: boolean) => {
    setBusy(true);
    setError("");
    try {
      const result = await create({
        data: { messageId, name, publish: isPublic, publishConfirmed: isPublic && publish },
      });
      await navigate({ to: "/binders/$id", params: { id: result.binder_id } });
    } catch {
      setError("I could not create this binder. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const pending = payload.status === "pending";
  return (
    <div className="min-w-0">
      <BinderCover cards={cards} name={name} />
      {rename ? (
        <label className="text-sm font-semibold">
          Binder name
          <Input
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
          <Button variant="ghost" onClick={() => setRename(false)}>
            Done
          </Button>
        </label>
      ) : (
        <h3 className="break-words font-bold">{name}</h3>
      )}
      {payload.description && (
        <p className="mt-1 text-sm text-muted-foreground">{payload.description}</p>
      )}
      <ul className="mt-3 space-y-3">
        {cards.map((c, i) => (
          <li key={`${c.id}-${i}`} className="flex gap-3">
            {c.image_url && (
              <img src={c.image_url} alt={c.name} className="h-20 w-14 shrink-0 object-contain" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.reason}</p>
            </div>
          </li>
        ))}
      </ul>
      {pending ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={working || busy}
            className="rounded-full"
            onClick={() => setRename(true)}
          >
            <Pencil />
            Rename
          </Button>
          <Button
            disabled={working || busy || !name.trim()}
            className="rounded-full"
            onClick={() => void save(false)}
          >
            <Check />
            Create
          </Button>
          <Button
            variant="outline"
            disabled={working || busy || !name.trim()}
            className="rounded-full"
            onClick={() => setPublish(true)}
          >
            <Globe />
            Publish
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {payload.status === "confirmed" ? "Created" : "Editing"}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog open={publish} onOpenChange={setPublish}>
        <DialogContent className="max-w-[350px] rounded-3xl">
          <DialogTitle>Create and publish this binder?</DialogTitle>
          <DialogDescription>
            Anyone with the link can see its cover, cards and Mori’s reasons. Private memories and
            slab photos stay private.
          </DialogDescription>
          <Button disabled={busy} className="rounded-full" onClick={() => void save(true)}>
            Confirm publish
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            className="rounded-full"
            onClick={() => setPublish(false)}
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
