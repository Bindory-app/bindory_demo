import { Link } from "@tanstack/react-router";
import { Mori } from "./Mori";

/** Shown on signed-in pages to a guest: sign-in lives on Ask Mori. */
export function SignInPrompt({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Mori className="h-36 w-36" />
      <p className="mt-4 text-lg font-bold">Log in to see {what}.</p>
      <p className="mt-1 text-sm text-muted-foreground">Mori keeps your cards and stories safe.</p>
      <Link
        to="/"
        className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-primary-foreground"
      >
        Log in with Mori
      </Link>
    </div>
  );
}
