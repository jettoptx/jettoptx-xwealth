/**
 * Dry-run pipeline tests â€” no secrets, LIVE blocked, optional skipGate.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runDryRun } from "../dist/dry-run.js";
import { inspectSigner } from "../dist/signer.js";

describe("runDryRun", () => {
  it("ok dry-run with mock gate + pay URL", async () => {
    const intent = await runDryRun({
      to: "https://x.com/i/money/pay/demo_user",
      amount: 1,
      asset: "USDC",
      wallet: "11111111111111111111111111111111",
      skipGate: true,
      mockGate: {
        ok: true,
        uiAmount: 1,
        message: "mock PASS",
      },
    });
    assert.equal(intent.ok, true);
    assert.equal(intent.mode, "dry-run");
    assert.equal(intent.live, false);
    assert.equal(intent.settle, false);
    assert.equal(intent.wouldSettle, false);
    assert.equal(intent.handle, "demo_user");
    assert.equal(intent.kind, "pay");
    assert.equal(intent.amount, 1);
    assert.equal(intent.jtxGate.ok, true);
    assert.equal(intent.blockers.length, 0);
    assert.equal("secretKey" in intent, false);
    assert.equal("privateKey" in intent, false);
  });

  it("fails bad amount", async () => {
    const intent = await runDryRun({
      to: "demo_user",
      amount: 0,
      skipGate: true,
      mockGate: { ok: true, uiAmount: 1, message: "mock" },
      wallet: "11111111111111111111111111111111",
    });
    assert.equal(intent.ok, false);
    assert.ok(intent.blockers.some((b) => b.includes("amount")));
  });

  it("fails bad link", async () => {
    const intent = await runDryRun({
      to: "https://x.com/not-money",
      amount: 1,
      skipGate: true,
      mockGate: { ok: true, uiAmount: 1, message: "mock" },
      wallet: "11111111111111111111111111111111",
    });
    assert.equal(intent.ok, false);
  });

  it("LIVE is always blocked even with confirm", async () => {
    const intent = await runDryRun({
      to: "https://x.com/i/money/pay/demo_user",
      amount: 1,
      mode: "LIVE",
      liveConfirm: "LIVE",
      skipGate: true,
      mockGate: { ok: true, uiAmount: 1, message: "mock" },
      wallet: "11111111111111111111111111111111",
    });
    assert.equal(intent.ok, false);
    assert.equal(intent.live, false);
    assert.equal(intent.settle, false);
    assert.ok(intent.blockers.some((b) => /LIVE|settle/i.test(b)));
  });

  it("LIVE without confirm blocked", async () => {
    const intent = await runDryRun({
      to: "demo_user",
      amount: 1,
      mode: "LIVE",
      skipGate: true,
      mockGate: { ok: true, uiAmount: 1, message: "mock" },
      wallet: "11111111111111111111111111111111",
    });
    assert.equal(intent.ok, false);
    assert.ok(intent.blockers.some((b) => b.includes("liveConfirm")));
  });
});

describe("inspectSigner", () => {
  it("missing path is present:false without throwing", () => {
    const s = inspectSigner("/nonexistent/xwealth-no-such-keypair.json");
    assert.equal(s.present, false);
    assert.equal(s.pubkey, null);
    assert.ok(s.error);
  });
});
