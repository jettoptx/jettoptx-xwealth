#!/usr/bin/env node
/**
 * OPTX high-stakes approve_action CLI — mint / status / wait via Aaron.
 *
 *   node scripts/high-stakes-cli.mjs mint --kind trade_buy --summary "R1 ~$144" ...
 *   node scripts/high-stakes-cli.mjs status --cid ch_…
 *   node scripts/high-stakes-cli.mjs wait --cid ch_… --timeout 300
 *
 * Never silent-signs. Phone (MOJO SEND-02) completes with gaze TOTP.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function has(flag) {
  return process.argv.includes(`--${flag}`);
}

const AARON = (
  process.env.AARON_ROUTER_URL ||
  process.env.VITE_AARON_ROUTER_URL ||
  "https://aaron.jettoptics.ai"
).replace(/\/$/, "");

async function mint() {
  const kind = arg("kind", "custom");
  const summary = arg("summary");
  if (!summary) {
    console.error(JSON.stringify({ ok: false, error: "--summary required" }));
    process.exit(1);
  }
  const action = {
    kind,
    summary,
    amount: arg("amount"),
    asset: arg("asset"),
    symbol: arg("symbol"),
    venue: arg("venue"),
    size: arg("size"),
    notional_usdc: arg("notional") || arg("notional_usdc"),
    agent: arg("agent", "optx"),
    harness: arg("harness", "cli"),
    policy_ref: arg("policy_ref"),
    resource: arg("resource"),
  };
  // drop nulls
  for (const k of Object.keys(action)) {
    if (action[k] == null) delete action[k];
  }
  const origin = arg("origin", "optx");
  try {
    const r = await fetch(`${AARON}/jett/totp/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "approve_action", origin, action }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.log(
        JSON.stringify({
          ok: false,
          error: `aaron ${r.status}`,
          detail: t.slice(0, 400),
          aaron: AARON,
        }),
      );
      process.exit(1);
    }
    const d = await r.json();
    const exp = d.exp || Math.floor(Date.now() / 1000) + 300;
    // Always emit jettmojo://approve for this CLI — production Aaron may
    // still mint login-shaped qr until approve_action is deployed.
    const qr = `jettmojo://approve?cid=${d.cid}&origin=${origin}&exp=${exp}`;
    const serverQr = d.qrPayload || d.qr_payload || null;
    console.log(
      JSON.stringify({
        ok: true,
        cid: d.cid,
        type: "approve_action",
        origin,
        exp,
        expiresAt: d.expiresAt ?? exp * 1000,
        qrPayload: qr,
        serverQr,
        needs_aaron_deploy:
          serverQr && !String(serverQr).includes("approve")
            ? "Aaron returned non-approve QR — deploy jettoptx-aaron-router with approve_action"
            : false,
        action: d.action ?? action,
        aaron: AARON,
        note: "Show qrPayload as QR / deep link. MOJO SEND-02 → 4-digit gaze. No silent sign.",
      }),
    );
  } catch (e) {
    // degraded local
    const cid = `ch_local_ap_${Date.now().toString(36)}`;
    const exp = Math.floor(Date.now() / 1000) + 300;
    const qrPayload = `jettmojo://approve?cid=${cid}&origin=${origin}&exp=${exp}`;
    console.log(
      JSON.stringify({
        ok: true,
        cid,
        type: "approve_action",
        origin,
        exp,
        expiresAt: exp * 1000,
        qrPayload,
        action,
        degraded: true,
        error: e instanceof Error ? e.message : String(e),
        note: "Aaron unreachable — local QR only; complete needs live Aaron.",
      }),
    );
  }
}

async function status() {
  const cid = arg("cid");
  if (!cid) {
    console.error(JSON.stringify({ ok: false, error: "--cid required" }));
    process.exit(1);
  }
  const r = await fetch(`${AARON}/jett/totp/status?cid=${encodeURIComponent(cid)}`);
  const d = await r.json().catch(() => ({}));
  console.log(JSON.stringify({ ok: r.ok, aaron: AARON, ...d }));
  process.exit(d.status === "verified" ? 0 : r.ok ? 0 : 1);
}

async function wait() {
  const cid = arg("cid");
  if (!cid) {
    console.error(JSON.stringify({ ok: false, error: "--cid required" }));
    process.exit(1);
  }
  const timeoutSec = Number(arg("timeout", "300"));
  const start = Date.now();
  while ((Date.now() - start) / 1000 < timeoutSec) {
    const r = await fetch(
      `${AARON}/jett/totp/status?cid=${encodeURIComponent(cid)}`,
    );
    const d = await r.json().catch(() => ({}));
    if (d.status === "verified") {
      console.log(JSON.stringify({ ok: true, ...d }));
      process.exit(0);
    }
    if (d.status === "expired") {
      console.log(JSON.stringify({ ok: false, error: "expired", ...d }));
      process.exit(1);
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  console.log(JSON.stringify({ ok: false, error: "timeout", cid }));
  process.exit(1);
}

const cmd = process.argv[2] || "help";
if (cmd === "mint") await mint();
else if (cmd === "status") await status();
else if (cmd === "wait") await wait();
else {
  console.log(`Usage:
  node scripts/high-stakes-cli.mjs mint --kind trade_buy --summary "…" [--symbol SPCX/USDC] [--notional 144] [--agent traderjoe] [--harness cron]
  node scripts/high-stakes-cli.mjs status --cid ch_…
  node scripts/high-stakes-cli.mjs wait --cid ch_… [--timeout 300]

Env: AARON_ROUTER_URL (default https://aaron.jettoptics.ai)
`);
  process.exit(cmd === "help" ? 0 : 1);
}
