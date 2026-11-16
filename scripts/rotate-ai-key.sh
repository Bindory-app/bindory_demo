#!/bin/zsh
# Replace the AI Gateway key locally (.env.local) and in the Vercel project, then redeploy.
# The key is read without echoing and never printed or written to shell history.
set -e
cd "$(dirname "$0")/.."
read -s "KEY?Paste the new AI Gateway key, then press Enter: "
echo
if [[ "$KEY" != vck_* ]]; then echo "That doesn't look like an AI Gateway key (it should start with vck_). Nothing changed."; exit 1; fi
umask 077
if [[ -f .env.local ]]; then grep -v '^AI_GATEWAY_API_KEY=' .env.local > .env.local.tmp || true; else : > .env.local.tmp; fi
printf 'AI_GATEWAY_API_KEY=%s\n' "$KEY" >> .env.local.tmp && mv .env.local.tmp .env.local
echo "Saved locally."
printf '%s' "$KEY" | npx --yes vercel env add AI_GATEWAY_API_KEY production --force >/dev/null 2>&1 && echo "Saved in Vercel."
unset KEY
echo "Redeploying so the live site uses the new key…"
./deploy.sh >/dev/null 2>&1 && echo "Done. You can now delete the old key in Vercel."
