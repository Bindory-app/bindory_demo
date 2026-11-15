import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Download,
  KeyRound,
  LogOut,
  Mail,
  Palette,
  Shield,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Toast } from "@/components/Toast";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

const SECTIONS = [
  "profile",
  "contact",
  "signin",
  "privacy",
  "notifications",
  "appearance",
  "data",
  "delete",
  "demo",
] as const;
type Section = (typeof SECTIONS)[number];

export const Route = createFileRoute("/settings")({
  validateSearch: (s: Record<string, unknown>): { section?: Section } =>
    SECTIONS.includes(s["section"] as Section) ? { section: s["section"] as Section } : {},
  head: () => ({
    meta: [
      { title: "Settings · Bindory" },
      { name: "description", content: "Your Bindory profile, privacy, notifications and data." },
      { property: "og:title", content: "Settings · Bindory" },
      {
        property: "og:description",
        content: "Your Bindory profile, privacy, notifications and data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

type Profile = Tables<"profiles">;
const TITLES: Record<Section, string> = {
  profile: "Profile details",
  contact: "Contact details",
  signin: "Sign-in methods",
  privacy: "Privacy",
  notifications: "Notifications",
  appearance: "Theme & colour mode",
  data: "Your data",
  delete: "Delete account",
  demo: "Demo collection",
};

const asObj = (v: Json | undefined): Record<string, Json | undefined> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};

function SettingsPage() {
  const { session, ready } = useSession();
  const { section } = Route.useSearch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState("");
  const [revision, setRevision] = useState(0);
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    void supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle()
      .then((r) => active && setProfile(r.data));
    return () => {
      active = false;
    };
  }, [uid, revision]);

  const go = (s?: Section) => void navigate({ to: "/settings", search: s ? { section: s } : {} });
  const back = (
    <button
      type="button"
      onClick={() => (section ? go() : void navigate({ to: "/profile" }))}
      aria-label="Back"
      className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"
    >
      <ChevronLeft className="size-6" />
    </button>
  );

  if (ready && !session)
    return (
      <AppShell title="Settings" action={back}>
        <SignInPrompt what="your settings" />
      </AppShell>
    );

  const update = async (patch: Partial<Profile>, ok = "Saved") => {
    if (!uid) return false;
    const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
    if (error) {
      setToast(
        error.code === "23505"
          ? "That username is taken"
          : error.code === "23514"
            ? "Please check the details and try again"
            : "Could not save. Please try again.",
      );
      return false;
    }
    setToast(ok);
    setRevision((r) => r + 1);
    return true;
  };

  return (
    <AppShell
      title={section ? TITLES[section] : "Settings"}
      kicker={section ? "Settings" : "App preferences"}
      action={back}
    >
      {section &&
        section !== "contact" &&
        section !== "signin" &&
        section !== "appearance" &&
        section !== "delete" &&
        !profile && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
      {!section && <Menu go={go} demoLoaded={"demo_loaded" in asObj(profile?.settings)} />}
      {section === "profile" && profile && <ProfileForm profile={profile} update={update} />}
      {section === "contact" && (
        <Info>
          <Row label="Email">{session?.user.email}</Row>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign-in links and account messages go to this address.
          </p>
        </Info>
      )}
      {section === "signin" && (
        <Info>
          <Row label="Email link">On</Row>
          <Row label="Google">
            {session?.user.identities?.some((i) => i.provider === "google")
              ? "Connected"
              : "Not connected"}
          </Row>
          <p className="mt-3 text-sm text-muted-foreground">
            Bindory signs you in with a one-time email link, so there is no password to change.
          </p>
        </Info>
      )}
      {section === "privacy" && profile && <Privacy profile={profile} update={update} />}
      {section === "notifications" && profile && (
        <Notifications profile={profile} update={update} />
      )}
      {section === "appearance" && <Appearance />}
      {section === "data" && uid && <DataExport uid={uid} onError={setToast} />}
      {section === "delete" && <DeleteAccount onError={setToast} />}
      {section === "demo" && profile && (
        <DemoLoader
          profile={profile}
          onDone={(m) => {
            setToast(m);
            setRevision((r) => r + 1);
          }}
        />
      )}
      <Toast text={toast} onDone={() => setToast("")} />
    </AppShell>
  );
}

function Menu({ go, demoLoaded }: { go: (s: Section) => void; demoLoaded: boolean }) {
  const groups: { title: string; items: [Section, string, string, typeof User][] }[] = [
    {
      title: "Account",
      items: [
        ["profile", "Profile details", "Name, username and bio", User],
        ["contact", "Contact details", "Email for sign-in", Mail],
      ],
    },
    {
      title: "Sign-in & security",
      items: [["signin", "Sign-in methods", "Email link and Google", KeyRound]],
    },
    {
      title: "Privacy & notifications",
      items: [
        ["privacy", "Privacy", "Profile visibility", Shield],
        ["notifications", "Notifications", "What Mori tells you about", Bell],
      ],
    },
    {
      title: "Appearance",
      items: [["appearance", "Theme & colour mode", "Light, dark or match device", Palette]],
    },
    {
      title: "Data & account",
      items: [
        ["data", "Download my data", "A copy of everything you've added", Download],
        ["delete", "Delete account", "Permanently remove your account", Trash2],
      ],
    },
    {
      title: "Demo",
      items: [
        [
          "demo",
          "Demo collection",
          demoLoaded ? "Loaded" : "Fill this account with sample data",
          Sparkles,
        ],
      ],
    },
  ];
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.title}>
          <p className="mb-2 text-sm font-bold">{g.title}</p>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            {g.items.map(([id, label, hint, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0"
              >
                <Icon
                  className={`size-5 shrink-0 ${id === "delete" ? "text-destructive" : "text-primary"}`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-bold ${id === "delete" ? "text-destructive" : ""}`}
                  >
                    {label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ))}
      <button
        type="button"
        onClick={() => void supabase.auth.signOut().then(() => (window.location.href = "/"))}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-bold"
      >
        <LogOut className="size-4" /> Log out
      </button>
    </div>
  );
}

const field =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary";
const Info = ({ children }: { children: ReactNode }) => (
  <div className="rounded-3xl border border-border bg-card p-4">{children}</div>
);
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-b-0">
    <span className="font-semibold">{label}</span>
    <span className="text-muted-foreground">{children}</span>
  </div>
);
const Primary = ({ children, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...p}
    className="mt-5 w-full rounded-full bg-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
  >
    {children}
  </button>
);

function ProfileForm({
  profile,
  update,
}: {
  profile: Profile;
  update: (p: Partial<Profile>) => Promise<boolean>;
}) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [since, setSince] = useState(
    profile.collecting_since ? String(profile.collecting_since) : "",
  );
  const [busy, setBusy] = useState(false);
  const validUser = !username || /^[a-z0-9_.]{3,24}$/.test(username);
  const year = Number(since);
  const validSince =
    !since || (Number.isInteger(year) && year >= 1996 && year <= new Date().getFullYear());
  const submit = async () => {
    setBusy(true);
    await update({
      display_name: name.trim() || null,
      username: username || null,
      bio: bio.trim() || null,
      location: location.trim() || null,
      collecting_since: since ? year : null,
    });
    setBusy(false);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="mb-1 mt-1 block text-sm font-bold">Display name</label>
      <input
        className={field}
        value={name}
        maxLength={50}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="mb-1 mt-4 block text-sm font-bold">Username</label>
      <input
        className={field}
        value={username}
        maxLength={24}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
        placeholder="wingcollects"
      />
      {!validUser && (
        <p className="mt-1 text-xs text-destructive">
          3–24 characters: lowercase letters, numbers, dots or underscores.
        </p>
      )}
      <label className="mb-1 mt-4 block text-sm font-bold">Short bio</label>
      <textarea
        className={`${field} min-h-20`}
        value={bio}
        maxLength={160}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Cards, memories and moonlit finds."
      />
      <label className="mb-1 mt-4 block text-sm font-bold">Location</label>
      <input
        className={field}
        value={location}
        maxLength={60}
        onChange={(e) => setLocation(e.target.value)}
      />
      <label className="mb-1 mt-4 block text-sm font-bold">Collecting since</label>
      <input
        className={field}
        value={since}
        inputMode="numeric"
        maxLength={4}
        onChange={(e) => setSince(e.target.value.replace(/\D/g, ""))}
        placeholder="2023"
      />
      {!validSince && (
        <p className="mt-1 text-xs text-destructive">Enter a year from 1996 to now.</p>
      )}
      <Primary type="submit" disabled={busy || !validUser || !validSince}>
        Save profile details
      </Primary>
    </form>
  );
}

function Toggle({
  label,
  hint,
  on,
  set,
}: {
  label: string;
  hint: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => set(!on)}
        className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${on ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-card transition ${on ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}

function Privacy({
  profile,
  update,
}: {
  profile: Profile;
  update: (p: Partial<Profile>) => Promise<boolean>;
}) {
  const s = asObj(profile.settings);
  return (
    <>
      <Info>
        <Toggle
          label="Public profile"
          hint="Let other collectors see your profile, posts and public binders."
          on={profile.is_public}
          set={(v) => void update({ is_public: v })}
        />
        <Toggle
          label="Show activity totals"
          hint="Show your card and binder counts on your profile."
          on={s["show_activity"] !== false}
          set={(v) => void update({ settings: { ...s, show_activity: v } })}
        />
      </Info>
      <p className="mt-3 px-1 text-sm text-muted-foreground">
        Memories are private unless you choose to share one. Mori never uses private memories to
        suggest collectors.
      </p>
    </>
  );
}

const NOTIFY: [string, string, string][] = [
  ["community", "Community activity", "Follows, saves and comments on public binders"],
  ["daily_check_in", "Daily check-in", "A gentle reminder to keep your streak"],
  ["events", "Event updates", "Featured events and community challenges"],
  ["product_updates", "Product updates", "New tools, styles and features"],
];

function Notifications({
  profile,
  update,
}: {
  profile: Profile;
  update: (p: Partial<Profile>) => Promise<boolean>;
}) {
  const s = asObj(profile.settings);
  const n = asObj(s["notifications"]);
  return (
    <Info>
      {NOTIFY.map(([id, label, hint]) => (
        <Toggle
          key={id}
          label={label}
          hint={hint}
          on={n[id] !== false}
          set={(v) => void update({ settings: { ...s, notifications: { ...n, [id]: v } } })}
        />
      ))}
    </Info>
  );
}

function Appearance() {
  const read = () => {
    try {
      return localStorage.getItem("bindory-theme") ?? "system";
    } catch {
      return "system";
    }
  };
  const [mode, setMode] = useState("system");
  useEffect(() => setMode(read()), []);
  const apply = (m: string) => {
    try {
      if (m === "system") localStorage.removeItem("bindory-theme");
      else localStorage.setItem("bindory-theme", m);
    } catch {
      /* storage unavailable: still apply for this visit */
    }
    const dark =
      m === "dark" || (m === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    setMode(m);
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ["light", "Day mode"],
        ["dark", "Night mode"],
        ["system", "Match device"],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          onClick={() => apply(id!)}
          className={`rounded-2xl border py-4 text-sm font-bold ${mode === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const EXPORT_TABLES = [
  "profiles",
  "cards",
  "binders",
  "binder_cards",
  "memories",
  "wishlist",
  "posts",
  "check_ins",
  "points_events",
  "mori_messages",
] as const;

function DataExport({ uid, onError }: { uid: string; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
    for (const t of EXPORT_TABLES) {
      const q =
        t === "profiles"
          ? supabase.from(t).select("*").eq("id", uid)
          : supabase.from(t).select("*").eq("user_id", uid);
      const r = await q;
      if (r.error) {
        setBusy(false);
        onError("Could not prepare your data. Please try again.");
        return;
      }
      out[t] = r.data;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }),
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "bindory-my-data.json",
    });
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  };
  return (
    <Info>
      <p className="text-sm">
        A JSON file with your profile, cards, binders, memories, wish list, posts, points and Mori
        chat history.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Memory photos stay in private storage and aren't included.
      </p>
      <Primary type="button" disabled={busy} onClick={() => void run()}>
        {busy ? "Preparing…" : "Download my data"}
      </Primary>
    </Info>
  );
}

function DeleteAccount({ onError }: { onError: (m: string) => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setBusy(false);
      onError("Could not delete your account. Please try again.");
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  };
  return (
    <>
      <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <p className="font-bold text-destructive">This cannot be undone.</p>
        <p className="mt-1">
          Your profile, cards, binders, memories, posts and Mori chat history are permanently
          deleted. Public binder links stop working.
        </p>
      </div>
      <label className="mb-1 mt-5 block text-sm font-bold">Type DELETE to confirm</label>
      <input
        className={field}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        disabled={typed !== "DELETE" || busy}
        onClick={() => void run()}
        className="mt-5 w-full rounded-full bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-40"
      >
        Delete my account
      </button>
      <Link to="/settings" className="mt-3 block text-center text-sm font-bold">
        Keep my account
      </Link>
    </>
  );
}

function DemoLoader({ profile, onDone }: { profile: Profile; onDone: (m: string) => void }) {
  const loaded = "demo_loaded" in asObj(profile.settings);
  const [asWing, setAsWing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const run = async () => {
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc("load_demo_collection", { p_profile: asWing });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      onDone("Demo collection loaded");
      void navigate({ to: "/collection" });
    }
  };
  return (
    <Info>
      <p className="text-sm">
        Adds Wing's sample collection to this account: 22 real cards from TCGdex, three binders,
        five memories, a wish list, posts and two Mori-made videos.
      </p>
      {loaded ? (
        <p className="mt-4 rounded-2xl bg-secondary p-3 text-sm font-semibold">
          Already loaded on this account.
        </p>
      ) : (
        <>
          <Toggle
            label="Use Wing's profile"
            hint="Set the name, username, bio and photo to the demo collector."
            on={asWing}
            set={setAsWing}
          />
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <Primary type="button" disabled={busy} onClick={() => void run()}>
            {busy ? "Loading…" : "Load demo collection"}
          </Primary>
        </>
      )}
    </Info>
  );
}
