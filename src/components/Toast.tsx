import { useEffect } from "react";

/** A short status message above the bottom navigation. */
export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [text, onDone]);
  if (!text) return null;
  return (
    <p
      role="status"
      className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background"
    >
      {text}
    </p>
  );
}
