#!/usr/bin/env python3
"""Build the demo's front end from the Bindory wireframe, so the demo looks exactly like it.

Input:  the wireframe build (the same file published as the Claude artifact
        https://claude.ai/artifact/WCpwEEnmLd392RG34JHTUt), by default
        ~/collector-identity-platform/bindory-pitch-update/dist/bindory-app.html
Output: public/index.html, served at the root of demo.bindory.app

Only two things are added on top of the wireframe's own markup, styles and script:
  wireframe/app-mode.html  shows the app full screen (no side text, no drawn phone frame)
  wireframe/live.html      connects the wireframe to the real backend, if present

Usage: python3 scripts/build-wireframe.py [path/to/bindory-app.html]
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/collector-identity-platform/bindory-pitch-update/dist/bindory-app.html"
)
html = open(src, encoding="utf-8").read()

layers = ""
for name in ("app-mode.html", "live.html"):
    path = os.path.join(ROOT, "wireframe", name)
    if os.path.exists(path):
        layers += open(path, encoding="utf-8").read() + "\n"

html = html.replace("<title>Bindory</title>", "<title>Bindory · Ask Mori</title>", 1)

# One hook so the live layer can answer free-typed messages with the real Mori when signed in.
# Scripted states (onboarding, memory follow-ups, renaming) and attached photos stay with the wireframe.
ROUTE = "  async function route(text, attached) {\n"
assert html.count(ROUTE) == 1, "wireframe chat route() not found: update the hook in build-wireframe.py"
html = html.replace(
    ROUTE,
    ROUTE
    + "    if (window.bdLiveRoute && !M.pending && !attached && await window.bdLiveRoute(text, "
    + "{ addMsg, say, scrollDown })) return;\n",
    1,
)
end = html.rfind("</body>")
html = html[:end] + layers + html[end:] if end != -1 else html + layers

# Small hooks so the live layer can show the signed-in collector's real data in the wireframe's
# own screens. Each one only exposes existing data or reads a name; none changes any markup or style.
HOOKS = [
    ("window.cpProto={go,back,", "window.cpProto={GRAIL_KEYS,PB,FEED,renderFeed,renderPB,renderCollector,go,back,"),
    ("  const POSTS = [", "  const POSTS = window.bdPOSTS = ["),
    ("  const REELS = [", "  const REELS = window.bdREELS = ["),
    # Mori Studio: your real level (window.bdLevel), falling back to the wireframe's sample text.
    ("  function renderRoom() {\n",
     "  function renderRoom() {\n    const bdLv = (k, d) => (window.bdLevel && window.bdLevel[k] != null ? window.bdLevel[k] : d);\n"),
    ("const next = 500, pct = Math.min(100, Math.round(S.points / next * 100));",
     "const next = bdLv('next', 500), pct = bdLv('pct', Math.min(100, Math.round(S.points / next * 100)));"),
    ("<b>Level 3 · Starlight</b><span class=\"cp-room-bar\"><i style=\"width:64%\"></i></span>",
     "<b>' + bdLv('mori', 'Level 3 · Starlight') + '</b><span class=\"cp-room-bar\"><i style=\"width:' + bdLv('moriPct', 64) + '%\"></i></span>"),
    ("<small>Collector level</small><b>Level 3 · Curator</b></span><span class=\"cp-level-points\"><b>' + S.points",
     "<small>Collector level</small><b>' + bdLv('collector', 'Level 3 · Curator') + '</b></span><span class=\"cp-level-points\"><b>' + S.points"),
    ("(S.points >= next ? 'Level 4 · Archivist unlocked' : (next - S.points) + ' points to Level 4 · Archivist')",
     "(S.points >= next ? bdLv('nextName', 'Level 4 · Archivist') + ' unlocked' : (next - S.points) + ' points to ' + bdLv('nextName', 'Level 4 · Archivist'))"),
    ("qsa('[data-greeting]',app).forEach(x=>x.textContent=greeting()+', Wing');",
     "qsa('[data-greeting]',app).forEach(x=>x.textContent=greeting()+', '+(window.bdFirstName||'Wing'));"),
    ("  const L = { wish:", "  const L = window.bdL = { wish:"),
    ("const owned = k => !!binderOf(k);", "const owned = k => !!binderOf(k) || (S.loose || []).includes(k);"),
    ("const ownedCards = () => [...new Set(S.binders.flatMap(b => b.cards))]",
     "const ownedCards = () => [...new Set(S.binders.flatMap(b => b.cards).concat(S.loose || []))]"),
    ("const allOwnedCards = () => [...new Set(S.binders.flatMap(b => b.cards))]",
     "const allOwnedCards = () => [...new Set(S.binders.flatMap(b => b.cards).concat(S.loose || []))]"),
    ("'Hi Wing, what shall we do today?'", "'Hi ' + (window.bdFirstName || 'Wing') + ', what shall we do today?'"),
    ("toast('Welcome back, Wing')", "toast('Welcome back, ' + (window.bdFirstName || 'Wing'))"),
    ("You are all set, Wing.", "You are all set, ' + (window.bdFirstName || 'Wing') + '."),
]
for old, new in HOOKS:
    assert html.count(old) == 1, f"hook point not found once: {old[:60]}"
    html = html.replace(old, new, 1)

out = os.path.join(ROOT, "public", "index.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Wrote {out} ({len(html) // 1024} KB) from {src}")
