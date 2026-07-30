/**
 * Web4 Agent SEO — product thesis for X Wealth /augments
 * ========================================================
 *
 * Web2 SEO ranked *pages* for human browsers.
 * Web3 SEO ranked *wallets / NFTs / protocols* for explorers.
 * **Web4 SEO ranks agent-payable identities + settleable assets**:
 *   @handles · pay surfaces · skills · tokens · DeFi protocols.
 *
 * X Wealth is the Jett Optics / JTX cornerstone for that layer —
 * the "ai.com/augment" surface: discover → enrich → page → settle.
 *
 * Tool stack (server-side + MCP):
 *  1. X native API       — followers/following graph, profile, avatars
 *  2. xAI Grok           — ranking, summarization, agent page payloads
 *  3. TinyFish           — open-web Search + Fetch + Agent MCP
 *  4. Blockworks/Messari — native crypto token + DeFi protocol search
 *                          https://blockworks.com/products/api-mcp
 *                          MCP: https://mcp.messari.io/mcp
 *
 * /augments is the marketplace UI for this engine.
 */

import { OPTX_MARK } from "@/lib/brand";
import { BLOCKWORKS_MCP_URL, BLOCKWORKS_PRODUCT } from "@/lib/blockworks";
import { TINYFISH_MCP_URL } from "@/lib/tinyfish";

/** Canonical slogan — the brand line for /augments */
export const WEB4_SLOGAN = "THE SEO of Web4 — powered by AstroKnots Algo";

export const WEB4_SEO = {
  name: "Web4 Agent SEO",
  product: "X Wealth",
  surface: "/augments",
  /** Hero slogan */
  slogan: WEB4_SLOGAN,
  tagline: WEB4_SLOGAN,
  subtag: `${OPTX_MARK} · X Wealth · agent-payable identities + crypto/DeFi`,
  thesis:
    "X Wealth is THE SEO of Web4 — powered by AstroKnots Algo. Ranking @handles, X Money pay cards, tokens, and DeFi protocols the way classic SEO ranked pages.",
  pillars: [
    {
      id: "x-graph",
      title: "X native graph",
      blurb: "Followers / following · profile logos · OAuth scopes",
    },
    {
      id: "x-money",
      title: "X Money surfaces",
      blurb: "Who can receive agent pay · pay URL · enrollment probe",
    },
    {
      id: "tinyfish",
      title: "TinyFish discovery",
      blurb: "Open-web Search + Fetch + Agent MCP",
    },
    {
      id: "blockworks",
      title: "Blockworks · Messari",
      blurb: "Native token + DeFi protocol ranker (API + MCP)",
    },
    {
      id: "grok",
      title: "xAI Grok tooling",
      blurb: "Rank, summarize, and draft agent page payloads",
    },
  ],
  mcp: {
    tinyfish: TINYFISH_MCP_URL,
    blockworks: BLOCKWORKS_MCP_URL,
  },
  productLinks: {
    blockworks: BLOCKWORKS_PRODUCT,
  },
  /** Open-web / agent identity presets (TinyFish) */
  defaultQueries: [
    {
      id: "xmoney-agents",
      label: "X Money agents",
      query: "X Money pay agents USDC Solana creator payments",
      purpose:
        "Web4 agent SEO: find creator identities with X Money / agent pay surfaces",
    },
    {
      id: "x402",
      label: "x402 rails",
      query: "x402 protocol agent payments HTTP 402",
      purpose: "Map x402 agent commerce endpoints and docs for Augments",
    },
    {
      id: "optx",
      label: `${OPTX_MARK} ecosystem`,
      query: "Jett Optics OPTX X Wealth agent pay",
      purpose: "Discover OPTX / Jett Optics wealth and agent surfaces",
    },
    {
      id: "news",
      label: "Agent pay news",
      query: "AI agent payments X Money crypto 2026",
      purpose: "Fresh news for Web4 agent SEO radar",
      domainType: "news" as const,
    },
  ],
  /** Crypto / DeFi presets (Blockworks Messari lane) */
  cryptoQueries: [
    {
      id: "sol",
      label: "Solana",
      query: "solana",
      mode: "crypto" as const,
    },
    {
      id: "usdc",
      label: "USDC",
      query: "usdc",
      mode: "crypto" as const,
    },
    {
      id: "jup",
      label: "Jupiter",
      query: "jupiter",
      mode: "defi" as const,
    },
    {
      id: "aave",
      label: "Aave",
      query: "aave",
      mode: "defi" as const,
    },
    {
      id: "uni",
      label: "Uniswap",
      query: "uniswap",
      mode: "defi" as const,
    },
    {
      id: "jtx",
      label: "JTX rails",
      query: "solana defi USDC agent payments",
      mode: "crypto" as const,
    },
  ],
} as const;

export type Web4ToolId =
  | "tinyfish-search"
  | "blockworks"
  | "x-graph"
  | "tinyfish-fetch"
  | "x-money"
  | "grok";

export type DiscoverLane = "agents" | "crypto" | "defi";

export const WEB4_TOOL_PIPELINE: Array<{
  id: Web4ToolId;
  step: number;
  title: string;
  role: string;
}> = [
  {
    id: "tinyfish-search",
    step: 1,
    title: "Web",
    role: "TinyFish Search · agent & news signals",
  },
  {
    id: "blockworks",
    step: 2,
    title: "Crypto/DeFi",
    role: "Blockworks Messari · tokens & protocols",
  },
  {
    id: "x-graph",
    step: 3,
    title: "Graph",
    role: "X followers / following + logos",
  },
  {
    id: "tinyfish-fetch",
    step: 4,
    title: "Enrich",
    role: "Profile + Money page content",
  },
  {
    id: "x-money",
    step: 5,
    title: "Gate",
    role: "X Money yes / no badges",
  },
  {
    id: "grok",
    step: 6,
    title: "Page",
    role: "Grok rank + x402 agent payloads",
  },
];
