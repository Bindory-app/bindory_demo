import { Link } from "@tanstack/react-router";
import { Home, Search, User, Moon, Sun, Grid2X2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("bindory-theme", next ? "dark" : "light");
    setDark(next);
  };
  return { dark, toggle };
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function AppShell({
  title,
  action,
  children,
  greeting,
  kicker,
  home = false,
  collection = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  greeting?: string;
  kicker?: string;
  home?: boolean;
  collection?: boolean;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas-outer">
      <div
        className={`relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col shadow-phone ${home || collection ? "bg-card" : "bg-background"}`}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pb-3 pt-6">
          <div className="min-w-0">
            {kicker && (
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                {kicker}
              </p>
            )}
            {greeting && <p className="mb-1 text-sm font-bold text-primary">{greeting}</p>}
            <h1
              className={`truncate font-bold text-foreground ${home || collection ? "text-3xl" : "text-2xl"}`}
            >
              {title}
            </h1>
          </div>
          {action ?? <ThemeToggle />}
        </header>
        <main className="flex-1 px-5 pb-40">{children}</main>
        <BottomNav home={home} />
      </div>
    </div>
  );
}

const navProps = {
  activeProps: { className: "bg-primary text-banner-foreground" },
  inactiveProps: { className: "text-muted-foreground" },
  activeOptions: { exact: true },
};

export function BottomNav(_props: { home?: boolean } = {}) {
  const item = "grid h-12 w-12 place-items-center rounded-2xl";
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-1/2 z-20 flex h-[74px] w-full max-w-[390px] -translate-x-1/2 items-center justify-around border-t border-border bg-card px-3"
    >
      <Link to="/home" aria-label="Home" title="Home" className={item} {...navProps}>
        <Home className="size-7" />
      </Link>
      <Link to="/search" aria-label="Search" title="Search" className={item} {...navProps}>
        <Search className="size-7" />
      </Link>
      <Link
        to="/"
        aria-label="Ask Mori"
        title="Ask Mori"
        className="-mt-9 grid h-[72px] w-[72px] place-items-center rounded-full bg-brand p-1 shadow-orb ring-4 ring-card"
      >
        <span className="grid h-full w-full place-items-center rounded-full bg-card">
          <img src="/mori-face.png" alt="" className="h-full w-full object-contain" />
        </span>
      </Link>
      <Link
        to="/collection"
        aria-label="My Collection"
        title="My Collection"
        className={item}
        {...navProps}
      >
        <Grid2X2 className="size-7" />
      </Link>
      <Link to="/profile" aria-label="My Profile" title="My Profile" className={item} {...navProps}>
        <User className="size-7" />
      </Link>
    </nav>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl border border-border bg-card p-4 text-card-foreground ${className}`}
    >
      {children}
    </section>
  );
}
