#!/usr/bin/env node
/**
 * Real dry-run CLI â€” gate + parse + optional local signer check â†’ intent JSON.
 *
 * Usage:
 *   node scripts/dry-run.mjs --to https://x.com/i/money/pay/demo_user --amount 1
 *   node scripts/dry-run.mjs --to demo_user --amount 1 --asset USDC
 *   SOLANA_WALLET=â€¦ XWEALTH_KEYPAIR=â€¦ node scripts/dry-run.mjs --to â€¦ --amount 1
 *
 * LIVE is rejected:
 *   node scripts/dry-run.mjs --to â€¦ --amount 1 --live
 *
 * Never prints private keys. Exit 0 = dry-run ok; 1 = blocked/fail; 2 = usage.
 */

import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  if (name.startsWith("--") && ["--live", "--json", "--help", "-h"].includes(name)) {
    return true;
  }
  return process.argv[i + 1] ?? fallback;
}

function has(name) {
  return process.argv.includes(name);
}

if (has("--help") || has("-h")) {
  console.log(`xwealth dry-run

  --to <handle|url>     X handle or https://x.com/i/money/pay|transfer/{handle}
  --amount <n>          Amount (USDC default)
  --asset USDC|USD      Default USDC
  --wallet <pubkey>     Override SOLANA_WALLET
  --keypair <path>      Local id.json (XWEALTH_KEYPAIR) â€” secret never printed
  --live                Attempt LIVE (always blocked until settle ships)
  --json                Print intent JSON only

Env: SOLANA_WALLET, XWEALTH_KEYPAIR, SOLANA_RPC_URL
`);
  process.exit(0);
}

const to = arg("--to");
const amountRaw = arg("--amount");
if (!to || amountRaw == null) {
  console.error("usage: node scripts/dry-run.mjs --to <handle|url> --amount <n>");
  process.exit(2);
}

const amount = Number(amountRaw);
const live = has("--live");
const jsonOnly = has("--json");

const { runDryRun } = await import(
  pathToFileURL(join(root, "dist", "dry-run.js")).href
);

const intent = await runDryRun({
  to: String(to),
  amount,
  asset: arg("--asset", "USDC") || "USDC",
  mode: live ? "LIVE" : "dry-run",
  liveConfirm: live ? "LIVE" : undefined,
  wallet: arg("--wallet") || undefined,
  keypairPath: arg("--keypair") || undefined,
  method: "paste",
});

if (jsonOnly) {
  console.log(JSON.stringify(intent, null, 2));
} else {
  console.log("=== xwealth dry-run ===");
  console.log(JSON.stringify(intent, null, 2));
  if (intent.ok) {
    console.log("\nOK â€” dry-run intent ready (no funds moved).");
  } else {
    console.log("\nBLOCKED:");
    for (const b of intent.blockers) console.log(" -", b);
  }
}

process.exit(intent.ok ? 0 : 1);
