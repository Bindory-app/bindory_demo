import { Link } from "@tanstack/react-router";
import { Home, Search, Layers, User, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import faceAsset from "@/assets/mori-face.png.asset.json";

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
    <button onClick={toggle} aria-label="Toggle dark mode" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground">
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function AppShell({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas-outer">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-background shadow-phone">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pb-3 pt-6">
          <h1 className="truncate text-2xl font-bold text-foreground">{title}</h1>
          {action ?? <ThemeToggle />}
        </header>
        <main className="flex-1 px-5 pb-32">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

const item = "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold";
const linkProps = { activeProps: { className: "text-primary" }, inactiveProps: { className: "text-muted-foreground" }, activeOptions: { exact: true } };

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[390px] -translate-x-1/2 border-t border-border bg-card/95 px-2 pb-3 backdrop-blur">
      <div className="flex items-end">
        <Link to="/home" className={item} {...linkProps}><Home className="h-5 w-5" />Home</Link>
        <Link to="/search" className={item} {...linkProps}><Search className="h-5 w-5" />Search</Link>
        <Link to="/" className={item} {...linkProps}>
          <span className="-mt-8 grid h-16 w-16 place-items-center rounded-full bg-brand p-2 shadow-orb ring-4 ring-card">
            <img src={faceAsset.url} alt="" className="h-full w-full object-contain" />
          </span>
          Ask Mori
        </Link>
        <Link to="/collection" className={item} {...linkProps}><Layers className="h-5 w-5" />My Collection</Link>
        <Link to="/profile" className={item} {...linkProps}><User className="h-5 w-5" />My Profile</Link>
      </div>
    </nav>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-border bg-card p-4 text-card-foreground ${className}`}>{children}</section>;
}
