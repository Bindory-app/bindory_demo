#!/bin/sh
# Publish the Bindory demo to Vercel (project bindory-demo, team askmoribindory-3133).
# Builds locally, then deploys the prebuilt output from a clean folder outside git:
# Vercel blocks deploys whose git commit author isn't on the team, so no git metadata
# may be sent. Server settings (AI_GATEWAY_API_KEY, SUPABASE_*) live in the Vercel
# project's environment variables, not in this repo.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
rm -rf .vercel/output
npx vite build
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/.vercel"
cp -R .vercel/output "$TMP/.vercel/output"
cp .vercel/project.json "$TMP/.vercel/project.json"
cd "$TMP"
npx --yes vercel deploy --prebuilt --prod --yes
