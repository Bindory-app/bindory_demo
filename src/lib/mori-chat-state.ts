export function greetingFor(displayName: string) {
  const name = displayName.trim().split(/\s+/)[0];
  return name ? `Hi ${name}, what shall we do today?` : "Hi, what shall we do today?";
}

export function canAcceptMessage(phase: string, thinking: boolean, searching: boolean) {
  return phase !== "loading" && phase !== "profile-error" && !thinking && !searching;
}

export function mergeDoneMessages<T extends { id?: string | undefined; from: string }>(
  current: T[],
  incoming: T[],
) {
  const ids = new Set(current.flatMap((message) => (message.id ? [message.id] : [])));
  // The optimistic user bubble is already present, including photo-friendly text.
  return [
    ...current,
    ...incoming.filter((message) => message.from !== "me" && (!message.id || !ids.has(message.id))),
  ];
}

export function shouldRefocusAfterReply(maxTouchPoints: number, coarsePointer: boolean) {
  return maxTouchPoints === 0 && !coarsePointer;
}
