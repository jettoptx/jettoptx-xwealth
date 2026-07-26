/**
 * Unit tests — no network, no secrets, no SpacetimeDB.
 * Run: npm test  (node --test after build)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseMoneyLink,
  buildDryRunIntent,
} from "../dist/x-money-link.js";
import { createPayoutNode } from "../dist/nodes/payout.js";

describe("parseMoneyLink", () => {
  it("parses /pay/ receive QR", () => {
    const r = parseMoneyLink(
      "https://x.com/i/money/pay/JoshuaJett",
      "qr_lib",
    );
    assert.equal(r.ok, true);
    assert.equal(r.handle, "JoshuaJett");
    assert.equal(r.kind, "pay");
    assert.equal(r.transferUrl, "https://x.com/i/money/pay/JoshuaJett");
    assert.equal(r.isXMoney, true);
    assert.equal(r.method, "qr_lib");
  });

  it("parses /transfer/ path", () => {
    const r = parseMoneyLink(
      "https://x.com/i/money/transfer/JoshuaJett",
      "paste",
    );
    assert.equal(r.ok, true);
    assert.equal(r.kind, "transfer");
    assert.equal(r.handle, "JoshuaJett");
  });

  it("parses twitter host pay", () => {
    const r = parseMoneyLink("https://twitter.com/i/money/pay/foo_bar");
    assert.equal(r.ok, true);
    assert.equal(r.handle, "foo_bar");
    assert.equal(r.kind, "pay");
    assert.equal(r.transferUrl, "https://x.com/i/money/pay/foo_bar");
  });

  it("interprets bare handle as transfer", () => {
    const r = parseMoneyLink("@JoshuaJett");
    assert.equal(r.ok, true);
    assert.equal(r.handle, "JoshuaJett");
    assert.equal(r.kind, "transfer");
  });

  it("rejects non-money URL", () => {
    const r = parseMoneyLink("https://x.com/JoshuaJett");
    assert.equal(r.ok, false);
    assert.equal(r.isXMoney, false);
  });

  it("rejects empty", () => {
    const r = parseMoneyLink("  ");
    assert.equal(r.ok, false);
  });
});

describe("buildDryRunIntent", () => {
  it("never marks live/settle", () => {
    const link = parseMoneyLink("https://x.com/i/money/pay/JoshuaJett");
    const intent = buildDryRunIntent(link, { amountUsd: 1 });
    assert.equal(intent.mode, "dry-run");
    assert.equal(intent.live, false);
    assert.equal(intent.settle, false);
    assert.equal(intent.handle, "JoshuaJett");
    assert.equal(intent.amountUsd, 1);
  });
});

describe("payout node dry-run", () => {
  it("returns dry-run without network", async () => {
    const node = createPayoutNode({
      recipientHandle: "JoshuaJett",
      amount: 1,
      currency: "USDC",
      transferLink: "https://x.com/i/money/pay/JoshuaJett",
    });
    const out = await node.execute({ amount: 1, recipientHandle: "JoshuaJett" });
    assert.equal(out.mode, "dry-run");
    assert.equal(out.live, false);
    assert.equal(out.txId, null);
    assert.equal(out.recipientHandle, "JoshuaJett");
    assert.equal(out.kind, "pay");
  });
});

describe("gate validation (offline)", () => {
  it("invalid wallet fails without throwing", async () => {
    const { checkJtxGate } = await import("../dist/jtx-gate.js");
    const r = await checkJtxGate("short");
    assert.equal(r.ok, false);
    assert.ok(r.message || r.uiAmount === 0);
  });
});
