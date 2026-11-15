import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Mori } from "@/components/Mori";
import { ConfirmCard } from "@/components/ConfirmCard";
import type { ProposalPayload } from "@/lib/mori-tools";

export type MoriMessage = {
  id?: string | undefined;
  from: "me" | "mori";
  text: string;
  chips?: { label: string; image?: string | undefined }[] | undefined;
  kind?: string | undefined;
  payload?: ProposalPayload | undefined;
};

export function MoriTranscript({
  message,
  working,
  tapChip,
  act,
}: {
  message: MoriMessage;
  working: boolean;
  tapChip: (label: string) => void;
  act: (message: MoriMessage, action: "confirm" | "edit") => void;
}) {
  const parts =
    message.kind === "confirm" && message.payload
      ? [{ type: "proposal" as const, payload: message.payload }]
      : [{ type: "text" as const, text: message.text }];
  return (
    <Message
      from={message.from === "me" ? "user" : "assistant"}
      className={`max-w-full ${message.from === "mori" ? "relative pl-10" : "pl-10"}`}
    >
      {message.from === "mori" && <Mori className="absolute bottom-0 left-0 h-9 w-8" />}
      <MessageContent
        className={
          message.from === "me"
            ? "group-[.is-user]:rounded-3xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-primary group-[.is-user]:text-banner-foreground"
            : "w-full rounded-3xl rounded-bl-md border border-border bg-card p-3 text-foreground"
        }
      >
        {message.kind === "status" ? (
          <Tool defaultOpen={false} className="mb-0 border-0">
            <ToolHeader
              title={message.text}
              type="dynamic-tool"
              toolName="mori"
              state="output-available"
              className="gap-1 p-0 [&_span]:text-[10px] [&_div]:flex-wrap"
            />
            <ToolContent className="px-0 pb-0 text-xs">{message.text}</ToolContent>
          </Tool>
        ) : (
          parts.map((part, index) =>
            part.type === "proposal" ? (
              <ConfirmCard
                key={index}
                payload={part.payload}
                working={working}
                onConfirm={() => act(message, "confirm")}
                onEdit={() => act(message, "edit")}
              />
            ) : (
              <MessageResponse key={index}>{part.text}</MessageResponse>
            ),
          )
        )}
        {message.chips && (
          <div className="flex flex-wrap gap-2">
            {message.chips.map((chip, index) => (
              <Button
                variant="outline"
                key={index}
                onClick={() => tapChip(chip.label)}
                className="h-auto whitespace-normal rounded-full px-3 py-2 text-xs font-bold text-primary"
              >
                {chip.image && <img src={chip.image} alt="" className="h-10 w-7 object-contain" />}
                {chip.label}
              </Button>
            ))}
          </div>
        )}
      </MessageContent>
    </Message>
  );
}
