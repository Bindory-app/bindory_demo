import { useEffect } from "react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

/**
 * Demo only: the first time an account with no cards signs in, fill it with the demo
 * collection (it keeps the collector's own name). Runs once per account per browser session.
 */
export function DemoBootstrap() {
  const { session } = useSession();
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    const key = `bindory-demo-ensured:${uid}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable: the database check below still runs only once per account */
    }
    void supabase.rpc("ensure_demo_collection").then(({ data, error }) => {
      if (error) return;
      const loaded =
        typeof data === "object" &&
        data !== null &&
        !Array.isArray(data) &&
        data["loaded"] === true;
      // Pages already loaded empty data; show the collection now. Ask Mori keeps its chat.
      if (loaded && window.location.pathname !== "/") window.location.reload();
    });
  }, [uid]);
  return null;
}
