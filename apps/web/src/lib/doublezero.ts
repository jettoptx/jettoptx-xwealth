/**
 * DoubleZero — high-performance permissionless network (open-source platform)
 * ==========================================================================
 *
 * Web4 SEO surface for /augments: rank DoubleZero as Solana network infra
 * alongside agent pay / DeFi discovery.
 *
 * Live link status: https://data.doublezero.xyz/status/links
 * Status API:       https://data.doublezero.xyz/api/status
 * Docs:             https://docs.malbeclabs.com/
 * Core OSS:         https://github.com/malbeclabs/doublezero
 * Foundation OSS:   https://github.com/doublezerofoundation
 */

export const DOUBLEZERO_HOME = "https://doublezero.xyz";
export const DOUBLEZERO_STATUS_LINKS =
  "https://data.doublezero.xyz/status/links";
export const DOUBLEZERO_STATUS_API = "https://data.doublezero.xyz/api/status";
export const DOUBLEZERO_DATA = "https://data.doublezero.xyz";
export const DOUBLEZERO_DASHBOARD = "https://doublezero.xyz/dashboard";
export const DOUBLEZERO_NETWORK_HEALTH = "https://doublezero.xyz/network-health";
export const DOUBLEZERO_DOCS = "https://docs.malbeclabs.com/";
export const DOUBLEZERO_WHITEPAPER = "https://doublezero.xyz/whitepaper.pdf";
export const DOUBLEZERO_EDGE = "https://doublezero.xyz/dz-edge";
export const DOUBLEZERO_GITHUB_CORE =
  "https://github.com/malbeclabs/doublezero";
export const DOUBLEZERO_GITHUB_ORG_FOUNDATION =
  "https://github.com/doublezerofoundation";
export const DOUBLEZERO_GITHUB_ORG_MALBEC =
  "https://github.com/malbeclabs";

export type DoubleZeroSurfaceKind =
  | "status"
  | "product"
  | "docs"
  | "component"
  | "repo";

export type DoubleZeroSurface = {
  id: string;
  name: string;
  blurb: string;
  href: string;
  kind: DoubleZeroSurfaceKind;
  /** GitHub org when this is a public repo */
  org?: "malbeclabs" | "doublezerofoundation";
  /** Optional docs deep-link */
  docs?: string;
  tags: string[];
};

/** Public product + ops surfaces (SEO crawl targets). */
export const DOUBLEZERO_PRODUCT_SURFACES: DoubleZeroSurface[] = [
  {
    id: "dz-status-links",
    name: "Link status",
    blurb: "Live fiber link health · metros · devices · utilization",
    href: DOUBLEZERO_STATUS_LINKS,
    kind: "status",
    tags: ["status", "links", "network", "latency"],
  },
  {
    id: "dz-data",
    name: "DoubleZero Data",
    blurb: "Network telemetry console · status API",
    href: DOUBLEZERO_DATA,
    kind: "status",
    tags: ["data", "api", "telemetry"],
  },
  {
    id: "dz-dashboard",
    name: "Network dashboard",
    blurb: "Live map of nodes, links, and coverage",
    href: DOUBLEZERO_DASHBOARD,
    kind: "product",
    tags: ["dashboard", "map"],
  },
  {
    id: "dz-network-health",
    name: "Network health",
    blurb: "Real-time performance and health metrics",
    href: DOUBLEZERO_NETWORK_HEALTH,
    kind: "product",
    tags: ["health", "performance"],
  },
  {
    id: "dz-edge",
    name: "DoubleZero Edge",
    blurb: "Dedicated low-latency transport for Solana market data",
    href: DOUBLEZERO_EDGE,
    kind: "product",
    docs: "https://docs.malbeclabs.com/Edge%20Subscriber%20Connection/",
    tags: ["edge", "multicast", "shreds", "solana"],
  },
  {
    id: "dz-geolocation",
    name: "Geolocation verification",
    blurb: "Physics-based, onchain-verifiable location proof",
    href: "https://doublezero.xyz/geolocation-verification",
    kind: "product",
    docs: "https://docs.malbeclabs.com/geolocation/",
    tags: ["geolocation", "proof"],
  },
  {
    id: "dz-home",
    name: "DoubleZero",
    blurb: "High-performance permissionless network protocol",
    href: DOUBLEZERO_HOME,
    kind: "product",
    tags: ["protocol", "fiber", "solana"],
  },
  {
    id: "dz-whitepaper",
    name: "Whitepaper",
    blurb: "Technical whitepaper (PDF)",
    href: DOUBLEZERO_WHITEPAPER,
    kind: "docs",
    tags: ["whitepaper", "docs"],
  },
];

/** Architecture components from Malbec Labs docs. */
export const DOUBLEZERO_COMPONENTS: DoubleZeroSurface[] = [
  {
    id: "dzc-daemon",
    name: "DoubleZero Daemon",
    blurb: "Core daemon for network participation",
    href: "https://docs.malbeclabs.com/architecture/#doublezero-daemon",
    kind: "component",
    docs: "https://docs.malbeclabs.com/architecture/",
    tags: ["daemon", "architecture"],
  },
  {
    id: "dzc-activator",
    name: "Activator",
    blurb: "Activates and manages network services",
    href: "https://docs.malbeclabs.com/architecture/#activator",
    kind: "component",
    docs: "https://docs.malbeclabs.com/architecture/",
    tags: ["activator", "architecture"],
  },
  {
    id: "dzc-controller",
    name: "Controller",
    blurb: "Control-plane orchestration for the fabric",
    href: "https://docs.malbeclabs.com/architecture/#controller",
    kind: "component",
    docs: "https://docs.malbeclabs.com/architecture/",
    tags: ["controller", "architecture"],
  },
  {
    id: "dzc-agent",
    name: "Agent",
    blurb: "Device-side agent for link and user ops",
    href: "https://docs.malbeclabs.com/architecture/#agent",
    kind: "component",
    docs: "https://docs.malbeclabs.com/architecture/",
    tags: ["agent", "architecture"],
  },
  {
    id: "dzc-device",
    name: "Device",
    blurb: "Physical / hybrid network device role",
    href: "https://docs.malbeclabs.com/architecture/#device",
    kind: "component",
    docs: "https://docs.malbeclabs.com/architecture/",
    tags: ["device", "architecture"],
  },
];

/** Docs lanes for Web4 discover + marketplace SEO. */
export const DOUBLEZERO_DOCS_SURFACES: DoubleZeroSurface[] = [
  {
    id: "dzd-home",
    name: "Docs home",
    blurb: "Malbec Labs · DoubleZero documentation",
    href: DOUBLEZERO_DOCS,
    kind: "docs",
    tags: ["docs"],
  },
  {
    id: "dzd-architecture",
    name: "Architecture",
    blurb: "Actors and components of the DoubleZero network",
    href: "https://docs.malbeclabs.com/architecture/",
    kind: "docs",
    tags: ["architecture", "docs"],
  },
  {
    id: "dzd-quick-connect",
    name: "Quick connect",
    blurb: "Wizard to connect validators and tenants",
    href: "https://docs.malbeclabs.com/quick-connect/",
    kind: "docs",
    tags: ["connect", "validator"],
  },
  {
    id: "dzd-setup",
    name: "Setup",
    blurb: "Initial setup flow for DoubleZero users",
    href: "https://docs.malbeclabs.com/setup/",
    kind: "docs",
    tags: ["setup"],
  },
  {
    id: "dzd-mainnet",
    name: "Mainnet-beta IBRL",
    blurb: "Validator mainnet-beta connection in IBRL mode",
    href: "https://docs.malbeclabs.com/DZ%20Mainnet-beta%20Connection/",
    kind: "docs",
    tags: ["mainnet", "validator", "ibrl"],
  },
  {
    id: "dzd-testnet",
    name: "Testnet connection",
    blurb: "Validator testnet connection guide",
    href: "https://docs.malbeclabs.com/DZ%20Testnet%20Connection/",
    kind: "docs",
    tags: ["testnet", "validator"],
  },
  {
    id: "dzd-edge-sub",
    name: "Edge subscriber",
    blurb: "Subscribe to DoubleZero Edge multicast feeds",
    href: "https://docs.malbeclabs.com/Edge%20Subscriber%20Connection/",
    kind: "docs",
    tags: ["edge", "multicast"],
  },
  {
    id: "dzd-contribute",
    name: "Contribute capacity",
    blurb: "Add bandwidth / compute to grow the network",
    href: "https://docs.malbeclabs.com/contribute-overview/",
    kind: "docs",
    tags: ["contribute", "bandwidth"],
  },
  {
    id: "dzd-sol-2z",
    name: "SOL → 2Z",
    blurb: "Swap SOL to 2Z conversion docs",
    href: "https://docs.malbeclabs.com/Swapping-sol-to-2z/",
    kind: "docs",
    tags: ["2z", "token", "solana"],
  },
  {
    id: "dzd-glossary",
    name: "Glossary",
    blurb: "DoubleZero terminology",
    href: "https://docs.malbeclabs.com/glossary/",
    kind: "docs",
    tags: ["glossary"],
  },
];

/**
 * Public open-source repos across Malbec Labs + DoubleZero Foundation.
 * Forks of unrelated tooling omitted; platform-adjacent forks kept when branded.
 */
export const DOUBLEZERO_REPOS: DoubleZeroSurface[] = [
  // Malbec Labs — core platform
  {
    id: "repo-doublezero",
    name: "doublezero",
    blurb: "Core networking stack for high-performance distributed systems",
    href: "https://github.com/malbeclabs/doublezero",
    kind: "repo",
    org: "malbeclabs",
    docs: "https://docs.malbeclabs.com/architecture/",
    tags: ["core", "rust", "network", "apache-2.0"],
  },
  {
    id: "repo-topology",
    name: "doublezero-topology",
    blurb: "Network topology, visualization, and data analysis",
    href: "https://github.com/malbeclabs/doublezero-topology",
    kind: "repo",
    org: "malbeclabs",
    tags: ["topology", "visualization"],
  },
  {
    id: "repo-lake",
    name: "lake",
    blurb: "Data analytics platform for DoubleZero",
    href: "https://github.com/malbeclabs/lake",
    kind: "repo",
    org: "malbeclabs",
    tags: ["analytics", "data"],
  },
  {
    id: "repo-edge-feed-spec",
    name: "edge-feed-spec",
    blurb: "Wire-format specs for Edge multicast data feeds",
    href: "https://github.com/malbeclabs/edge-feed-spec",
    kind: "repo",
    org: "malbeclabs",
    tags: ["edge", "spec", "multicast"],
  },
  {
    id: "repo-edge-multicast-ref",
    name: "edge-multicast-ref",
    blurb: "Reference designs for Edge multicast over sockets / XDP",
    href: "https://github.com/malbeclabs/edge-multicast-ref",
    kind: "repo",
    org: "malbeclabs",
    tags: ["edge", "xdp", "multicast"],
  },
  {
    id: "repo-edge-connect",
    name: "doublezero-edge-connect",
    blurb: "Edge connect tooling",
    href: "https://github.com/malbeclabs/doublezero-edge-connect",
    kind: "repo",
    org: "malbeclabs",
    tags: ["edge", "connect"],
  },
  {
    id: "repo-shredtop",
    name: "shredtop",
    blurb: "Solana shred tooling on DoubleZero paths",
    href: "https://github.com/malbeclabs/shredtop",
    kind: "repo",
    org: "malbeclabs",
    tags: ["shreds", "solana"],
  },
  {
    id: "repo-shred-watcher",
    name: "shred-watcher",
    blurb: "UDP shred listener · Jupiter DEX swap detection",
    href: "https://github.com/malbeclabs/shred-watcher",
    kind: "repo",
    org: "malbeclabs",
    tags: ["shreds", "defi", "jupiter"],
  },
  {
    id: "repo-borsh-incremental",
    name: "borsh-incremental-rs",
    blurb: "Incremental Borsh deserialization for schema evolution",
    href: "https://github.com/malbeclabs/borsh-incremental-rs",
    kind: "repo",
    org: "malbeclabs",
    tags: ["borsh", "rust"],
  },
  {
    id: "repo-malbec-docs",
    name: "doublezero-docs",
    blurb: "DoubleZero documentation sources",
    href: "https://github.com/malbeclabs/doublezero-docs",
    kind: "repo",
    org: "malbeclabs",
    docs: DOUBLEZERO_DOCS,
    tags: ["docs"],
  },
  {
    id: "repo-malbec-docs-site",
    name: "docs",
    blurb: "Malbec Labs docs site",
    href: "https://github.com/malbeclabs/docs",
    kind: "repo",
    org: "malbeclabs",
    docs: DOUBLEZERO_DOCS,
    tags: ["docs"],
  },
  // DoubleZero Foundation
  {
    id: "repo-dz-solana",
    name: "doublezero-solana",
    blurb: "Solana on-chain contracts for DoubleZero",
    href: "https://github.com/doublezerofoundation/doublezero-solana",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["solana", "contracts", "rust"],
  },
  {
    id: "repo-dz-offchain",
    name: "doublezero-offchain",
    blurb: "Off-chain components · CLI · revenue distribution",
    href: "https://github.com/doublezerofoundation/doublezero-offchain",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["offchain", "cli", "rust"],
  },
  {
    id: "repo-dz-ledger",
    name: "doublezero-ledger",
    blurb: "Side chain for DoubleZero state",
    href: "https://github.com/doublezerofoundation/doublezero-ledger",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["ledger", "sidechain"],
  },
  {
    id: "repo-shapley",
    name: "network-shapley",
    blurb: "Shapley values for network contributors (Python)",
    href: "https://github.com/doublezerofoundation/network-shapley",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["shapley", "rewards", "python"],
  },
  {
    id: "repo-shapley-rs",
    name: "network-shapley-rs",
    blurb: "Shapley values for network contributors (Rust)",
    href: "https://github.com/doublezerofoundation/network-shapley-rs",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["shapley", "rewards", "rust"],
  },
  {
    id: "repo-fees",
    name: "fees",
    blurb: "DoubleZero fee schedule information",
    href: "https://github.com/doublezerofoundation/fees",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["fees"],
  },
  {
    id: "repo-tenure",
    name: "tenure",
    blurb: "Measure validator tenure on DoubleZero",
    href: "https://github.com/doublezerofoundation/tenure",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["validator", "tenure"],
  },
  {
    id: "repo-updater",
    name: "doublezero-updater",
    blurb: "Sidecar that installs DoubleZero / DoubleZero Solana packages",
    href: "https://github.com/doublezerofoundation/doublezero-updater",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["updater", "ops"],
  },
  {
    id: "repo-edge-shreds-example",
    name: "doublezero-edge-solana-shreds-receiver-example",
    blurb: "Example shred receipt over doublezero-edge-solana",
    href: "https://github.com/doublezerofoundation/doublezero-edge-solana-shreds-receiver-example",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["edge", "shreds", "example"],
  },
  {
    id: "repo-sol-2z",
    name: "sol-2z-conversion-v1",
    blurb: "On-chain program + oracle to convert SOL → 2Z",
    href: "https://github.com/doublezerofoundation/sol-2z-conversion-v1",
    kind: "repo",
    org: "doublezerofoundation",
    docs: "https://docs.malbeclabs.com/Swapping-sol-to-2z/",
    tags: ["2z", "token", "solana"],
  },
  {
    id: "repo-svm-hash",
    name: "svm-hash-rs",
    blurb: "Solana-compatible hashing and Merkle tree utilities",
    href: "https://github.com/doublezerofoundation/svm-hash-rs",
    kind: "repo",
    org: "doublezerofoundation",
    tags: ["svm", "hash", "merkle"],
  },
];

/** Full open-source platform catalog for marketplace + SEO. */
export const DOUBLEZERO_PLATFORM: DoubleZeroSurface[] = [
  ...DOUBLEZERO_PRODUCT_SURFACES,
  ...DOUBLEZERO_COMPONENTS,
  ...DOUBLEZERO_DOCS_SURFACES,
  ...DOUBLEZERO_REPOS,
];

export const DOUBLEZERO_SEO = {
  name: "DoubleZero",
  brand: "Malbec Labs · DoubleZero Foundation",
  slogan: "High-performance permissionless network for Solana & beyond",
  thesis:
    "DoubleZero is open-source network infrastructure for distributed systems — dedicated fiber, Edge multicast, Solana contracts, and live link status — ranked on X Wealth Web4 SEO alongside agent pay and DeFi.",
  statusLinks: DOUBLEZERO_STATUS_LINKS,
  statusApi: DOUBLEZERO_STATUS_API,
  docs: DOUBLEZERO_DOCS,
  githubCore: DOUBLEZERO_GITHUB_CORE,
  githubFoundation: DOUBLEZERO_GITHUB_ORG_FOUNDATION,
  githubMalbec: DOUBLEZERO_GITHUB_ORG_MALBEC,
  logo: "/brand/tools/doublezero.png",
  accent: "#7dd3fc",
  query: "DoubleZero Solana network fiber Edge multicast open source",
} as const;

export type DoubleZeroStatusSummary = {
  status: string;
  timestamp: string | null;
  links: {
    total: number | null;
    healthy: number | null;
    degraded: number | null;
    down: number | null;
    issues: number | null;
  };
  network: {
    metros: number | null;
    devices: number | null;
    users: number | null;
    validatorsOnDz: number | null;
    bandwidthBps: number | null;
    totalStakeSol: number | null;
    stakeSharePct: number | null;
  };
  performance: {
    avgLatencyUs: number | null;
    p95LatencyUs: number | null;
    avgJitterUs: number | null;
    avgLossPercent: number | null;
  };
  source: string;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Normalize public `/api/status` JSON for /augments SEO cards. */
export function normalizeDoubleZeroStatus(
  raw: unknown,
): DoubleZeroStatusSummary {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const links = (d.links && typeof d.links === "object" ? d.links : {}) as Record<
    string,
    unknown
  >;
  const network = (
    d.network && typeof d.network === "object" ? d.network : {}
  ) as Record<string, unknown>;
  const performance = (
    d.performance && typeof d.performance === "object" ? d.performance : {}
  ) as Record<string, unknown>;

  return {
    status: typeof d.status === "string" ? d.status : "unknown",
    timestamp: typeof d.timestamp === "string" ? d.timestamp : null,
    links: {
      total: num(links.total),
      healthy: num(links.healthy),
      degraded: num(links.degraded),
      down: num(links.down),
      issues: num(links.issues),
    },
    network: {
      metros: num(network.metros),
      devices: num(network.devices),
      users: num(network.users),
      validatorsOnDz: num(network.validators_on_dz),
      bandwidthBps: num(network.bandwidth_bps),
      totalStakeSol: num(network.total_stake_sol),
      stakeSharePct: num(network.stake_share_pct),
    },
    performance: {
      avgLatencyUs: num(performance.avg_latency_us),
      p95LatencyUs: num(performance.p95_latency_us),
      avgJitterUs: num(performance.avg_jitter_us),
      avgLossPercent: num(performance.avg_loss_percent),
    },
    source: DOUBLEZERO_STATUS_LINKS,
  };
}

export async function fetchDoubleZeroStatus(
  init?: RequestInit,
): Promise<DoubleZeroStatusSummary> {
  const res = await fetch(DOUBLEZERO_STATUS_API, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`doublezero_status_${res.status}`);
  }
  return normalizeDoubleZeroStatus(await res.json());
}

export function doublezeroSurfacesByKind(
  kind: DoubleZeroSurfaceKind,
): DoubleZeroSurface[] {
  return DOUBLEZERO_PLATFORM.filter((s) => s.kind === kind);
}
