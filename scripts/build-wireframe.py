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
end = html.rfind("</body>")
html = html[:end] + layers + html[end:] if end != -1 else html + layers

out = os.path.join(ROOT, "public", "index.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Wrote {out} ({len(html) // 1024} KB) from {src}")
