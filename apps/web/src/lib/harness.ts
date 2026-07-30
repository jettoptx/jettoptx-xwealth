import type { XMoneyKind } from "./xmoney";
import { USDC_MINT_SOLANA, X402_ASSET, X402_NETWORK } from "./x402";

export type HarnessId = "grok-build" | "hermes" | "claude" | "custom";

export type HarnessDef = {
  id: HarnessId;
  name: string;
  short: string;
  blurb: string;
  docs: string;
  skillFile: string;
};

export const HARNESSES: HarnessDef[] = [
  {
    id: "grok-build",
    name: "Grok Build",
    short: "xAI agent harness",
    blurb: "Skill so Grok Build agents pay via x402 into your X Money account.",
    docs: "https://x.ai",
    skillFile: "jettoptx-xwealth.md",
  },
  {
    id: "hermes",
    name: "Hermes",
    short: "Nous Research",
    blurb: "Open harness edge that dry-runs x402 to your X Money pay link.",
    docs: "https://github.com/NousResearch/hermes-agent",
    skillFile: "jettoptx-xwealth-hermes.md",
  },
  {
    id: "claude",
    name: "Claude",
    short: "Anthropic",
    blurb: "Project skill / MCP tool so Claude can honor 402 against X Wealth.",
    docs: "https://claude.ai",
    skillFile: "jettoptx-xwealth-claude.md",
  },
  {
    id: "custom",
    name: "Custom",
    short: "Any agent / MCP",
    blurb: "Generic skill + env for Cursor, OpenClaw, LangGraph, shell agents…",
    docs: "https://x.com/jettoptx",
    skillFile: "jettoptx-xwealth-custom.md",
  },
];

export function buildHarnessSkill(opts: {
  harness: HarnessId;
  handle: string;
  payUrl: string;
  kind: XMoneyKind;
  endpointBase: string;
  /** Display name for custom harness (e.g. "OpenClaw", "My Bot") */
  customName?: string;
}): string {
  const amount = "0.10";
  const resource = `${opts.endpointBase.replace(/\/$/, "")}/api/x402/pay`;
  const common = {
    handle: opts.handle,
    payUrl: opts.payUrl,
    kind: opts.kind,
    network: X402_NETWORK,
    asset: X402_ASSET,
    mint: USDC_MINT_SOLANA,
    resource,
    amount,
  };

  if (opts.harness === "hermes") {
    return `# Hermes skill · jettoptx-xwealth

## Identity
- X handle: @${common.handle}
- X Money ${common.kind}: ${common.payUrl}
- Developer: Jett Optical Encryption (@jettoptx)

## x402 dry-run
When a tool or API responds with HTTP 402:

1. Read \`PAYMENT-REQUIRED\` (base64 JSON) or response body.
2. Prefer Solana USDC (\`${common.mint}\`) on \`${common.network}\`.
3. Build a dry-run payment payload (do not broadcast unless user enables live settle).
4. Retry with header \`PAYMENT-SIGNATURE: <base64 payload>\`.
5. Destination is the user's X Money account: ${common.payUrl}

## Default charge
- Amount: ${common.amount} USDC
- Resource: ${common.resource}

## Plugin
\`\`\`json
{
  "skill": "jettoptx-xwealth",
  "harness": "hermes",
  "xHandle": "${common.handle}",
  "xMoneyUrl": "${common.payUrl}",
  "network": "${common.network}",
  "asset": "${common.asset}",
  "mint": "${common.mint}",
  "resource": "${common.resource}",
  "dryRun": true
}
\`\`\`
`;
  }

  if (opts.harness === "claude") {
    return `# Claude skill · X Wealth x402

You can pay @${common.handle} using the x402 HTTP payment protocol (USDC on Solana).

## Linked X Money
- Handle: @${common.handle}
- ${common.kind} URL: ${common.payUrl}

## Flow
1. Call \`${common.resource}\` without payment → expect 402 + payment instructions.
2. Construct USDC exact payment for amount in the 402 body (default ${common.amount}).
3. Retry with \`PAYMENT-SIGNATURE\` header (base64 JSON payload).
4. Until live facilitator is enabled, mark payload \`dryRun: true\`.

## Tool descriptor
\`\`\`json
{
  "name": "xwealth_x402_pay",
  "description": "Pay X Wealth / X Money via x402 (USDC Solana) for @${common.handle}",
  "input_schema": {
    "type": "object",
    "properties": {
      "amountUsdc": { "type": "string", "default": "${common.amount}" },
      "dryRun": { "type": "boolean", "default": true }
    }
  }
}
\`\`\`

Jett Optical Encryption · E𝕏hibit build
`;
  }

  if (opts.harness === "custom") {
    const name = (opts.customName?.trim() || "Custom Agent").slice(0, 64);
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "custom";
    return `# skill: jettoptx-xwealth · ${name}

Generic x402 → X Money binding for any agent harness.

## Linked account
- X: @${common.handle}
- Money ${common.kind}: ${common.payUrl}
- Developer: Jett Optical Encryption (@jettoptx)

## Contract
1. Request \`${common.resource}\` (no payment header).
2. On **HTTP 402**, read \`PAYMENT-REQUIRED\` (base64 JSON) and/or JSON body.
3. Prefer \`${common.asset}\` on \`${common.network}\` (mint \`${common.mint}\`).
4. Attach \`PAYMENT-SIGNATURE: <base64>\` and retry.
5. Keep \`dryRun: true\` until live settle is enabled.

## Default charge
- Amount: ${common.amount} USDC
- Resource: ${common.resource}

## Plugin JSON
\`\`\`json
{
  "skill": "jettoptx-xwealth",
  "harness": "custom",
  "harnessName": ${JSON.stringify(name)},
  "harnessSlug": "${slug}",
  "xHandle": "${common.handle}",
  "xMoneyUrl": "${common.payUrl}",
  "network": "${common.network}",
  "asset": "${common.asset}",
  "mint": "${common.mint}",
  "resource": "${common.resource}",
  "amountUsdc": "${common.amount}",
  "dryRun": true
}
\`\`\`

## Shell smoke test
\`\`\`bash
# Expect 402
curl -i "${common.resource}"

# Dry-run settle (replace PAYLOAD with base64 signature body)
# curl -i -H "PAYMENT-SIGNATURE: $PAYLOAD" "${common.resource}"
\`\`\`
`;
  }

  // grok-build default
  return `# skill: jettoptx-xwealth

## X Wealth · agent pay surface
Plugin-and-play x402 payments into an X Money account.

### Linked account
- X: @${common.handle}
- Money ${common.kind} link: ${common.payUrl}
- Default rail: ${common.asset} / ${common.network}
- Mint: ${common.mint}

### When to use
Any time the user (or another tool) needs to charge or receive micropayments via HTTP 402 against this account.

### Steps
1. GET or POST ${common.resource}
2. On 402, decode payment requirements (PAYMENT-REQUIRED header or JSON body).
3. Sign/simulate USDC exact payment (dry-run default).
4. Retry with PAYMENT-SIGNATURE.
5. Surface receipt; do not live-settle unless user opts in.

### Harness binding
\`\`\`yaml
harness: grok-build
skill: jettoptx-xwealth
x_handle: ${common.handle}
x_money_url: ${common.payUrl}
network: ${common.network}
asset: ${common.asset}
resource: ${common.resource}
dry_run: true
developer: Jett Optical Encryption
\`\`\`
`;
}

export function buildEnvSnippet(opts: {
  handle: string;
  payUrl: string;
  endpointBase: string;
  customName?: string;
}): string {
  const customLine = opts.customName?.trim()
    ? `\nXWEALTH_HARNESS_NAME=${opts.customName.trim()}`
    : "";
  return `# X Wealth · agent harness env
XWEALTH_X_HANDLE=${opts.handle}
XWEALTH_MONEY_URL=${opts.payUrl}
XWEALTH_X402_URL=${opts.endpointBase.replace(/\/$/, "")}/api/x402/pay
XWEALTH_NETWORK=solana-mainnet
XWEALTH_ASSET=USDC
XWEALTH_MINT=${USDC_MINT_SOLANA}
XWEALTH_DRY_RUN=true
XWEALTH_DEVELOPER=Jett Optical Encryption${customLine}
`;
}
