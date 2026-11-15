import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Mori } from "./Mori";
import { Button } from "@/components/ui/button";

const GoogleG = () => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

export function AuthSheet({
  open,
  onOpenChange,
  mode = "login",
  onModeChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode?: "login" | "signup";
  onModeChange?: (mode: "login" | "signup") => void;
}) {
  const [currentMode, setCurrentMode] = useState(mode);
  useEffect(() => {
    setCurrentMode(mode);
    setStatus("idle");
    setError("");
  }, [mode, open]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const google = async () => {
    setError("");
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) setError("Google sign-in didn't work. Please try again.");
    else if (!r.redirected) onOpenChange(false);
  };

  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: currentMode === "signup",
      },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else setStatus("sent");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[390px] rounded-t-3xl border-border bg-card px-5 pb-8">
        <div className="flex flex-col items-center pt-2 text-center">
          <Mori className="h-24 w-24" />
          <DrawerTitle className="mt-2 text-lg font-bold leading-snug">
            {currentMode === "login"
              ? "Log in so Mori can remember your cards and stories."
              : "Create an account so Mori can remember your cards and stories."}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {currentMode === "login" ? "Log in" : "Sign up"} with Google or an email link
          </DrawerDescription>
        </div>
        {status === "sent" ? (
          <p className="mt-6 rounded-2xl bg-accent p-4 text-center text-sm font-semibold text-accent-foreground">
            Check {email} for your sign-in link.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={google}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F] dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3]"
            >
              <GoogleG />
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={magic} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email"
                className="h-12 w-full rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="submit"
                disabled={status === "sending"}
                className="h-12 w-full rounded-full bg-brand text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {status === "sending"
                  ? "Sending…"
                  : currentMode === "login"
                    ? "Email me a log-in link"
                    : "Email me a sign-up link"}
              </Button>
            </form>
          </div>
        )}
        {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {currentMode === "login" ? "New to Bindory?" : "Already have an account?"}{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={() => {
              const next = currentMode === "login" ? "signup" : "login";
              setCurrentMode(next);
              setStatus("idle");
              setError("");
              onModeChange?.(next);
            }}
          >
            {currentMode === "login" ? "Sign up" : "Log in"}
          </Button>
        </p>
      </DrawerContent>
    </Drawer>
  );
}
