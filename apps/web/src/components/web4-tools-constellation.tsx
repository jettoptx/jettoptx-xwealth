/**
 * Clean animated SVG for the four Web4 SEO rails:
 * TinyFish · SpaceXAI · Blockworks · JTX
 * Real brand logos from /public/brand/tools
 * JTX cube swaps light/dark via useTheme.
 */

import { useTheme } from "@/lib/theme";

const TOOLS = [
  {
    id: "tinyfish",
    label: "TinyFish",
    sub: "Search · Fetch · MCP",
    href: "https://docs.tinyfish.ai/mcp-integration",
    color: "#22d3ee",
    logo: "/brand/tools/tinyfish.png",
    logoScale: 0.92,
    cx: 120,
    cy: 100,
  },
  {
    id: "spacexai",
    label: "SpaceXAI",
    sub: "Grok · xAI tooling",
    href: "https://x.ai",
    color: "#a78bfa",
    /** Official xAI / Grok mark (SpaceXAI rail) */
    logo: "/harness/xai.svg",
    logoScale: 0.62,
    cx: 360,
    cy: 100,
  },
  {
    id: "blockworks",
    label: "Blockworks",
    sub: "Messari · crypto/DeFi",
    href: "https://blockworks.com/products/api-mcp",
    color: "#f472b6",
    logo: "/brand/tools/blockworks.png",
    logoScale: 0.82,
    cx: 120,
    cy: 260,
  },
  {
    id: "jtx",
    label: "JTX",
    sub: "OPT𝕏 · X Wealth",
    href: "/augments",
    color: "#34d399",
    /** Theme-resolved at render — see resolveLogo */
    logo: "/brand/jtx-logo-dark.png",
    logoLight: "/brand/jtx-logo-light.png",
    logoDark: "/brand/jtx-logo-dark.png",
    logoScale: 0.88,
    cx: 360,
    cy: 260,
  },
] as const;

const CENTER = { cx: 240, cy: 180 };
const NODE_R = 28;
const LOGO_BOX = 34;

function resolveToolLogo(
  t: (typeof TOOLS)[number],
  theme: "light" | "dark",
): string {
  if (t.id === "jtx" && "logoLight" in t && "logoDark" in t) {
    return theme === "light" ? t.logoLight : t.logoDark;
  }
  return t.logo;
}

export function Web4ToolsConstellation({
  className = "",
}: {
  className?: string;
}) {
  const { theme, mounted } = useTheme();
  const activeTheme = mounted ? theme : "dark";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-panel ${className}`}
      role="img"
      aria-label="Web4 SEO tools: TinyFish, SpaceXAI, Blockworks, and JTX connected by AstroKnots Algo"
    >
      <svg
        viewBox="0 0 480 360"
        className="web4-constellation h-auto w-full"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <defs>
          <radialGradient id="web4-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e8a87c" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#e8a87c" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#e8a87c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="web4-edge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.45" />
          </linearGradient>
          <filter id="web4-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {TOOLS.map((t) => (
            <clipPath key={`clip-${t.id}`} id={`clip-${t.id}`}>
              <circle cx={t.cx} cy={t.cy} r={NODE_R - 2} />
            </clipPath>
          ))}
          <clipPath id="clip-astroknots-hub">
            <circle cx={CENTER.cx} cy={CENTER.cy} r="40" />
          </clipPath>
        </defs>

        {/* ambient grid */}
        <g opacity="0.12" stroke="currentColor" className="text-fg">
          {[80, 160, 240, 320, 400].map((x) => (
            <line
              key={`vx${x}`}
              x1={x}
              y1="24"
              x2={x}
              y2="336"
              strokeWidth="0.5"
            />
          ))}
          {[60, 120, 180, 240, 300].map((y) => (
            <line
              key={`hy${y}`}
              x1="40"
              y1={y}
              x2="440"
              y2={y}
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* outer orbit rings */}
        <circle
          className="web4-orbit web4-orbit-a"
          cx={CENTER.cx}
          cy={CENTER.cy}
          r="128"
          fill="none"
          stroke="url(#web4-edge)"
          strokeWidth="1"
          strokeDasharray="4 10"
          opacity="0.55"
        />
        <circle
          className="web4-orbit web4-orbit-b text-border-strong"
          cx={CENTER.cx}
          cy={CENTER.cy}
          r="152"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="2 8"
          opacity="0.5"
        />

        {/* core glow */}
        <circle
          cx={CENTER.cx}
          cy={CENTER.cy}
          r="72"
          fill="url(#web4-core-glow)"
          className="web4-core-pulse"
        />

        {/* connection lines tool → center */}
        <g
          className="web4-edges"
          stroke="url(#web4-edge)"
          strokeWidth="1.25"
          fill="none"
        >
          {TOOLS.map((t) => (
            <line
              key={`e-${t.id}`}
              className="web4-edge-line"
              x1={t.cx}
              y1={t.cy}
              x2={CENTER.cx}
              y2={CENTER.cy}
              strokeDasharray="6 8"
            />
          ))}
        </g>

        {/* diamond lattice */}
        <g
          stroke="currentColor"
          className="text-border-strong"
          strokeWidth="0.75"
          opacity="0.35"
          fill="none"
        >
          <path d="M120 100 L360 100 L360 260 L120 260 Z" />
          <path d="M120 100 L360 260" strokeDasharray="3 6" opacity="0.6" />
          <path d="M360 100 L120 260" strokeDasharray="3 6" opacity="0.6" />
        </g>

        {/* center hub — AstroKnots Algo (event-horizon icon) */}
        <g filter="url(#web4-soft)">
          <circle
            className="web4-hub-ring"
            cx={CENTER.cx}
            cy={CENTER.cy}
            r="48"
            fill="none"
            stroke="#ff5a1f"
            strokeWidth="1.25"
            strokeDasharray="4 6"
            opacity="0.75"
          />
          <circle
            cx={CENTER.cx}
            cy={CENTER.cy}
            r="42"
            fill="#050508"
            stroke="#ff7a3a"
            strokeWidth="1.5"
            opacity="0.98"
          />
          <image
            href="/brand/tools/astroknots-algo.png"
            x={CENTER.cx - 40}
            y={CENTER.cy - 40}
            width="80"
            height="80"
            clipPath="url(#clip-astroknots-hub)"
            preserveAspectRatio="xMidYMid slice"
          />
          <text
            x={CENTER.cx}
            y={CENTER.cy + 64}
            textAnchor="middle"
            className="fill-subtle"
            style={{
              fontFamily: "Space Mono, ui-monospace, monospace",
              fontSize: "9px",
              letterSpacing: "0.14em",
            }}
          >
            ASTROKNOTS ALGO
          </text>
        </g>

        {/* tool nodes with real logos */}
        {TOOLS.map((t, i) => {
          const box = LOGO_BOX * t.logoScale;
          const logoSrc = resolveToolLogo(t, activeTheme);
          // JTX cube is mono — use white plate in dark, soft dark plate in light
          const plateFill =
            t.id === "jtx"
              ? activeTheme === "light"
                ? "#f4f4f5"
                : "#18181b"
              : "#fafafa";
          return (
            <a
              key={t.id}
              href={t.href}
              target={t.href.startsWith("http") ? "_blank" : undefined}
              rel={t.href.startsWith("http") ? "noreferrer" : undefined}
              className="web4-node-link"
            >
              <g className={`web4-node web4-node-${i}`}>
                <circle
                  className="web4-node-halo"
                  cx={t.cx}
                  cy={t.cy}
                  r="38"
                  fill={t.color}
                  opacity="0.14"
                />
                <circle
                  cx={t.cx}
                  cy={t.cy}
                  r={NODE_R}
                  fill={plateFill}
                  stroke={t.color}
                  strokeWidth="1.75"
                />
                <image
                  href={logoSrc}
                  x={t.cx - box / 2}
                  y={t.cy - box / 2}
                  width={box}
                  height={box}
                  clipPath={`url(#clip-${t.id})`}
                  preserveAspectRatio="xMidYMid meet"
                />
                <text
                  x={t.cx}
                  y={t.cy + 46}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-fg"
                  style={{
                    fontFamily: "Syne, ui-sans-serif, system-ui, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {t.label}
                </text>
                <text
                  x={t.cx}
                  y={t.cy + 60}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-subtle"
                  style={{
                    fontFamily: "Space Mono, ui-monospace, monospace",
                    fontSize: "8px",
                  }}
                >
                  {t.sub}
                </text>
              </g>
            </a>
          );
        })}

        {/* traveling particles */}
        {TOOLS.map((t, i) => (
          <circle
            key={`p-${t.id}`}
            className={`web4-particle web4-particle-${i}`}
            r="2.5"
            fill={t.color}
            filter="url(#web4-soft)"
          >
            <animateMotion
              dur={`${3.2 + i * 0.45}s`}
              repeatCount="indefinite"
              path={`M${t.cx},${t.cy} L${CENTER.cx},${CENTER.cy}`}
            />
          </circle>
        ))}
      </svg>

      <style>{`
        .web4-constellation {
          color: var(--color-fg);
        }
        .web4-orbit-a {
          animation: web4-spin 28s linear infinite;
          transform-origin: 240px 180px;
        }
        .web4-orbit-b {
          animation: web4-spin-rev 40s linear infinite;
          transform-origin: 240px 180px;
        }
        .web4-hub-ring {
          animation: web4-spin 18s linear infinite;
          transform-origin: 240px 180px;
        }
        .web4-core-pulse {
          animation: web4-pulse 3.6s ease-in-out infinite;
          transform-origin: 240px 180px;
        }
        .web4-edge-line {
          animation: web4-dash 2.4s linear infinite;
        }
        .web4-node-halo {
          animation: web4-halo 2.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .web4-node-0 .web4-node-halo { animation-delay: 0s; }
        .web4-node-1 .web4-node-halo { animation-delay: 0.5s; }
        .web4-node-2 .web4-node-halo { animation-delay: 1s; }
        .web4-node-3 .web4-node-halo { animation-delay: 1.5s; }
        .web4-node-link { cursor: pointer; }
        .web4-node-link:hover circle[r="${NODE_R}"] {
          stroke-width: 2.5;
          filter: brightness(1.05);
        }
        @keyframes web4-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes web4-spin-rev {
          to { transform: rotate(-360deg); }
        }
        @keyframes web4-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes web4-dash {
          to { stroke-dashoffset: -28; }
        }
        @keyframes web4-halo {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.22; transform: scale(1.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          .web4-orbit-a,
          .web4-orbit-b,
          .web4-hub-ring,
          .web4-core-pulse,
          .web4-edge-line,
          .web4-node-halo {
            animation: none !important;
          }
          .web4-particle { display: none; }
        }
      `}</style>
    </div>
  );
}
