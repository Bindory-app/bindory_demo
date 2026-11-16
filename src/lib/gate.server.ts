/**
 * Password gate for the demo. The password is checked on the server; passing it sets a signed,
 * HttpOnly cookie, and the demo page is only sent to requests carrying a valid cookie.
 * Env: GATE_PASSWORD (the shared password), GATE_SECRET (random, signs the cookie).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const GATE_COOKIE = "bd_gate";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const secret = () => process.env["GATE_SECRET"] || "";
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function passwordOk(input: string) {
  const expected = process.env["GATE_PASSWORD"] || "";
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export function gateCookie(email: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const data = Buffer.from(email).toString("base64url") + "." + exp;
  return `${GATE_COOKIE}=${data}.${sign(data)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function hasValidGate(request: Request) {
  if (!secret()) return false;
  const raw = (request.headers.get("cookie") || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(GATE_COOKIE + "="));
  if (!raw) return false;
  const value = raw.slice(GATE_COOKIE.length + 1);
  const i = value.lastIndexOf(".");
  if (i < 0) return false;
  const data = value.slice(0, i);
  const sig = Buffer.from(value.slice(i + 1));
  const good = Buffer.from(sign(data));
  if (sig.length !== good.length || !timingSafeEqual(sig, good)) return false;
  const exp = Number(data.split(".")[1]);
  return Number.isFinite(exp) && exp > Date.now() / 1000;
}

export const GATE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Bindory · Private demo</title>
<link rel="icon" href="/favicon.ico?v=bindory2">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=bindory2">
<style>
  :root { --ink:#1B2340; --muted:#6c7391; --line:#e4dbfb; --primary:#6752DF; --canvas:#F6F5FC; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body { min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px; background: linear-gradient(135deg,#ebe9ff,#f8edf7 54%,#e7fbf6); color: var(--ink);
    font-family: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif; }
  main { width: 100%; max-width: 380px; background: #fff; border: 1px solid var(--line); border-radius: 28px; padding: 28px 22px 24px; box-shadow: 0 24px 60px #2f38541f; text-align: center; }
  img { width: 128px; height: 128px; object-fit: contain; }
  .kicker { margin: 6px 0 0; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--primary); }
  h1 { margin: 4px 0 6px; font-size: 26px; letter-spacing: -.02em; }
  p.lead { margin: 0 0 20px; color: var(--muted); font-size: 14px; line-height: 1.45; }
  label { display: block; text-align: left; font-size: 12px; font-weight: 800; margin: 12px 4px 6px; }
  input { width: 100%; height: 48px; border-radius: 99px; border: 1px solid var(--line); padding: 0 18px; font: inherit; font-size: 16px; color: var(--ink); background: #fbfaff; outline: none; }
  input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px #6752df26; }
  button { width: 100%; height: 50px; margin-top: 20px; border: 0; border-radius: 99px; color: #fff; font: inherit; font-size: 15px; font-weight: 800; cursor: pointer;
    background: linear-gradient(135deg,#6250D8,#D98ACC); }
  button[disabled] { opacity: .6; }
  .error { min-height: 20px; margin: 12px 0 0; color: #c2334d; font-size: 13px; font-weight: 700; }
  .note { margin: 14px 0 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
</style>
</head>
<body>
<main>
  <img src="/mori-hd.png" alt="Mori">
  <p class="kicker">Private demo</p>
  <h1>Mori</h1>
  <p class="lead">This preview is invite-only.<br>Enter your email and the invite code you were given.</p>
  <form id="gate" novalidate>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" inputmode="email" required>
    <label for="password">Invite code</label>
    <input id="password" name="password" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" required>
    <button type="submit">Enter the demo</button>
    <p class="error" id="error" role="alert"></p>
  </form>
  <p class="note">We keep your email so we know who has tried Bindory. Questions: info@bindory.app</p>
</main>
<script>
  const form = document.getElementById("gate"), err = document.getElementById("error"), btn = form.querySelector("button");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const email = form.email.value.trim(), password = form.password.value;
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) { err.textContent = "Please enter a valid email."; return; }
    if (!password) { err.textContent = "Please enter your invite code."; return; }
    btn.disabled = true; btn.textContent = "Checking…";
    try {
      const res = await fetch("/api/gate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (res.ok) { location.reload(); return; }
      err.textContent = res.status === 401 ? "That invite code isn't right." : "Something went wrong. Please try again.";
    } catch { err.textContent = "Something went wrong. Please try again."; }
    btn.disabled = false; btn.textContent = "Enter the demo";
  });
</script>
</body>
</html>`;
