/**
 * Augments marketplace — listed X Wealth agent pay surfaces.
 * Seeded catalog for demo / E𝕏hibit; user can pin following + followers locally.
 */

export type AugmentRelation = "following" | "follower" | "marketplace";

export type AugmentListing = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  /** Public X Money pay URL */
  payUrl: string;
  kind: "pay" | "transfer";
  /** Default tip / page amount in USDC */
  defaultAmount: string;
  network: "solana";
  asset: "USDC";
  /** Which harnesses the listing advertises as wired */
  harnesses: Array<"grok-build" | "hermes" | "claude">;
  followers: number;
  following: number;
  /** Tags for marketplace filters */
  tags: string[];
  /** Featured on marketplace home */
  featured?: boolean;
  /** Seed relation for demo social graph around the signed-in user */
  relation?: AugmentRelation;
  /** Optional remote avatar (may be blocked — UI falls back to monogram) */
  avatarUrl?: string | null;
  accent?: string;
};

export const AUGMENT_SEED: AugmentListing[] = [
  {
    id: "jettoptx",
    handle: "jettoptx",
    displayName: "Jett Optics",
    bio: "Jett Optical Encryption · OPTX · X Wealth agent pay rails.",
    payUrl: "https://x.com/i/money/pay/jettoptx",
    kind: "pay",
    defaultAmount: "0.25",
    network: "solana",
    asset: "USDC",
    harnesses: ["grok-build", "hermes", "claude"],
    followers: 12840,
    following: 412,
    tags: ["encryption", "x402", "solana", "official"],
    featured: true,
    relation: "following",
    accent: "#ff6900",
  },
  {
    id: "elonmusk",
    handle: "elonmusk",
    displayName: "Elon Musk",
    bio: "Demo listing · agent-payable X Money surface (mock).",
    payUrl: "https://x.com/i/money/pay/elonmusk",
    kind: "pay",
    defaultAmount: "1.00",
    network: "solana",
    asset: "USDC",
    harnesses: ["grok-build", "claude"],
    followers: 220_000_000,
    following: 780,
    tags: ["x", "featured"],
    featured: true,
    relation: "following",
    accent: "#e8e8ec",
  },
  {
    id: "xai",
    handle: "xai",
    displayName: "xAI",
    bio: "Understand the universe · agent micropayments for Grok tools.",
    payUrl: "https://x.com/i/money/pay/xai",
    kind: "pay",
    defaultAmount: "0.10",
    network: "solana",
    asset: "USDC",
    harnesses: ["grok-build", "hermes"],
    followers: 2_400_000,
    following: 12,
    tags: ["ai", "grok", "x402"],
    featured: true,
    relation: "following",
    accent: "#a78bfa",
  },
  {
    id: "grok",
    handle: "grok",
    displayName: "Grok",
    bio: "Built by xAI · tip the harness that ships your agents.",
    payUrl: "https://x.com/i/money/pay/grok",
    kind: "pay",
    defaultAmount: "0.05",
    network: "solana",
    asset: "USDC",
    harnesses: ["grok-build"],
    followers: 1_100_000,
    following: 3,
    tags: ["ai", "agent"],
    relation: "following",
    accent: "#fbbf24",
  },
  {
    id: "solana",
    handle: "solana",
    displayName: "Solana",
    bio: "USDC rail default for X Wealth x402 dry-runs.",
    payUrl: "https://x.com/i/money/pay/solana",
    kind: "pay",
    defaultAmount: "0.15",
    network: "solana",
    asset: "USDC",
    harnesses: ["hermes", "claude"],
    followers: 3_200_000,
    following: 40,
    tags: ["solana", "usdc", "crypto"],
    featured: true,
    relation: "follower",
    accent: "#9945FF",
  },
  {
    id: "circle",
    handle: "circle",
    displayName: "Circle",
    bio: "USDC issuer · agent-ready settlement asset.",
    payUrl: "https://x.com/i/money/pay/circle",
    kind: "pay",
    defaultAmount: "0.50",
    network: "solana",
    asset: "USDC",
    harnesses: ["claude", "hermes"],
    followers: 480_000,
    following: 220,
    tags: ["usdc", "stablecoin"],
    relation: "follower",
    accent: "#3b82f6",
  },
  {
    id: "anthropic",
    handle: "AnthropicAI",
    displayName: "Anthropic",
    bio: "Claude harness skill · pay creators with 402.",
    payUrl: "https://x.com/i/money/pay/AnthropicAI",
    kind: "pay",
    defaultAmount: "0.20",
    network: "solana",
    asset: "USDC",
    harnesses: ["claude"],
    followers: 620_000,
    following: 90,
    tags: ["claude", "ai"],
    relation: "follower",
    accent: "#d4a574",
  },
  {
    id: "nous",
    handle: "NousResearch",
    displayName: "Nous Research",
    bio: "Hermes-class agent stack · x402 ready listing.",
    payUrl: "https://x.com/i/money/pay/NousResearch",
    kind: "pay",
    defaultAmount: "0.12",
    network: "solana",
    asset: "USDC",
    harnesses: ["hermes", "grok-build"],
    followers: 95_000,
    following: 310,
    tags: ["hermes", "open-source"],
    relation: "following",
    accent: "#22d3ee",
  },
  {
    id: "phantom",
    handle: "phantom",
    displayName: "Phantom",
    bio: "Wallet surface · Solana on-ramp companion.",
    payUrl: "https://x.com/i/money/transfer/phantom",
    kind: "transfer",
    defaultAmount: "0.08",
    network: "solana",
    asset: "USDC",
    harnesses: ["grok-build", "hermes", "claude"],
    followers: 890_000,
    following: 55,
    tags: ["wallet", "solana"],
    relation: "marketplace",
    accent: "#ab9ff2",
  },
  {
    id: "astroknots",
    handle: "astroknots",
    displayName: "Astro Knots",
    bio: "Reference wealth scaffold lineage · agent pay prototype.",
    payUrl: "https://x.com/i/money/pay/astroknots",
    kind: "pay",
    defaultAmount: "0.18",
    network: "solana",
    asset: "USDC",
    harnesses: ["grok-build", "claude"],
    followers: 12_400,
    following: 880,
    tags: ["wealth", "prototype"],
    relation: "marketplace",
    accent: "#ff6900",
    avatarUrl: "/brand/astroknots-icon.png",
  },
  {
    id: "devrel",
    handle: "XDevelopers",
    displayName: "X Developers",
    bio: "E𝕏hibit builders · page an agent, ship a skill.",
    payUrl: "https://x.com/i/money/pay/XDevelopers",
    kind: "pay",
    defaultAmount: "0.07",
    network: "solana",
    asset: "USDC",
    harnesses: ["grok-build"],
    followers: 540_000,
    following: 140,
    tags: ["developers", "exhibit"],
    featured: true,
    relation: "marketplace",
    accent: "#f4f4f5",
  },
  {
    id: "a16zcrypto",
    handle: "a16zcrypto",
    displayName: "a16z crypto",
    bio: "x402 ecosystem · agent commerce listings.",
    payUrl: "https://x.com/i/money/pay/a16zcrypto",
    kind: "pay",
    defaultAmount: "0.30",
    network: "solana",
    asset: "USDC",
    harnesses: ["claude", "hermes"],
    followers: 710_000,
    following: 200,
    tags: ["x402", "crypto"],
    relation: "marketplace",
    accent: "#f97316",
  },
];

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

export function monogram(handle: string): string {
  return (handle.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "X").toUpperCase();
}

export function filterListings(
  list: AugmentListing[],
  opts: {
    tab: "all" | "following" | "followers" | "featured";
    query: string;
    tag?: string | null;
  },
): AugmentListing[] {
  const q = opts.query.trim().toLowerCase().replace(/^@/, "");
  return list.filter((item) => {
    if (opts.tab === "following" && item.relation !== "following") return false;
    if (opts.tab === "followers" && item.relation !== "follower") return false;
    if (opts.tab === "featured" && !item.featured) return false;
    if (opts.tag && !item.tags.includes(opts.tag)) return false;
    if (!q) return true;
    return (
      item.handle.toLowerCase().includes(q) ||
      item.displayName.toLowerCase().includes(q) ||
      item.bio.toLowerCase().includes(q) ||
      item.tags.some((t) => t.includes(q))
    );
  });
}

export const MARKETPLACE_TAGS = [
  "x402",
  "solana",
  "usdc",
  "ai",
  "claude",
  "hermes",
  "grok",
  "encryption",
  "developers",
] as const;
