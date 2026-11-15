/** Remembers what a guest asked Mori so the conversation can continue after sign-in. */
const KEY = "bindory-pending-intent";
export const savePendingIntent = (text: string) => { try { localStorage.setItem(KEY, text); } catch { /* ignore */ } };
export const takePendingIntent = (): string | null => {
  try { const v = localStorage.getItem(KEY); localStorage.removeItem(KEY); return v; } catch { return null; }
};
