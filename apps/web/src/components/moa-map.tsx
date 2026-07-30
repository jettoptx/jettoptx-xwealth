import { useMemo, useState } from "react";
import {
  formatProofStrip,
  linkIsHot,
  MOA_NODE_LAYOUT,
  normalizeHandle,
  seedMoaNodes,
  type MoaLink,
  type MoaPublicProof,
} from "@/lib/moa-graph";
import { monogram } from "@/lib/augments";
import { Badge } from "@/components/ui/badge";

type Props = {
  links: MoaLink[];
  proofs: MoaPublicProof[];
  highlightProofId?: string | null;
  selectedHandle?: string | null;
  onSelectHandle: (handle: string) => void;
  onSelectProof: (proof: MoaPublicProof | null) => void;
};

const W = 640;
const H = 420;
const PAD = 36;

function layoutPoint(handle: string): { x: number; y: number } {
  const hit = MOA_NODE_LAYOUT.find(
    (n) => normalizeHandle(n.handle) === normalizeHandle(handle),
  );
  if (hit) {
    return {
      x: PAD + hit.x * (W - PAD * 2),
      y: PAD + hit.y * (H - PAD * 2),
    };
  }
  // Deterministic fallback ring for unlisted handles
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) | 0;
  const a = (Math.abs(h) % 360) * (Math.PI / 180);
  const r = 0.32;
  return {
    x: W / 2 + Math.cos(a) * r * (W - PAD * 2),
    y: H / 2 + Math.sin(a) * r * (H - PAD * 2),
  };
}

export function MoaMapView({
  links,
  proofs,
  highlightProofId,
  selectedHandle,
  onSelectHandle,
  onSelectProof,
}: Props) {
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);

  const nodes = useMemo(() => seedMoaNodes(), []);
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of nodes) m.set(normalizeHandle(n.handle), layoutPoint(n.handle));
    for (const l of links) {
      if (!m.has(normalizeHandle(l.fromHandle))) {
        m.set(normalizeHandle(l.fromHandle), layoutPoint(l.fromHandle));
      }
      if (!m.has(normalizeHandle(l.toHandle))) {
        m.set(normalizeHandle(l.toHandle), layoutPoint(l.toHandle));
      }
    }
    return m;
  }, [nodes, links]);

  const proofById = useMemo(() => {
    const m = new Map<string, MoaPublicProof>();
    for (const p of proofs) m.set(p.id, p);
    return m;
  }, [proofs]);

  function selectEdge(link: MoaLink) {
    setActiveEdgeId(link.id);
    const proof =
      (link.proofId && proofById.get(link.proofId)) ||
      proofs.find(
        (p) =>
          normalizeHandle(p.payerHandle) === normalizeHandle(link.fromHandle) &&
          normalizeHandle(p.payeeHandle) === normalizeHandle(link.toHandle),
      ) ||
      null;
    onSelectProof(proof);
  }

  const edgeList = links.slice(0, 24);

  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-xl border border-border bg-bg sm:block">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Map of Augments graph"
        >
          <defs>
            <marker
              id="moa-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" className="text-subtle" />
            </marker>
          </defs>

          {links.map((link) => {
            const a = pos.get(normalizeHandle(link.fromHandle));
            const b = pos.get(normalizeHandle(link.toHandle));
            if (!a || !b) return null;
            const hot = linkIsHot(link.kind);
            const hi =
              activeEdgeId === link.id ||
              (highlightProofId && link.proofId === highlightProofId);
            return (
              <g key={link.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={hot ? "var(--color-augment)" : "var(--color-border-strong)"}
                  strokeOpacity={hi ? 1 : hot ? 0.75 : 0.35}
                  strokeWidth={hi ? 2.5 : hot ? 2 : 1.25}
                  className="cursor-pointer"
                  onClick={() => selectEdge(link)}
                />
              </g>
            );
          })}

          {nodes.map((node) => {
            const p = pos.get(normalizeHandle(node.handle));
            if (!p) return null;
            const selected =
              selectedHandle &&
              normalizeHandle(selectedHandle) === normalizeHandle(node.handle);
            const hiProof =
              highlightProofId &&
              proofs.some(
                (pr) =>
                  pr.id === highlightProofId &&
                  (normalizeHandle(pr.payerHandle) ===
                    normalizeHandle(node.handle) ||
                    normalizeHandle(pr.payeeHandle) ===
                      normalizeHandle(node.handle)),
              );
            const r = node.handle === "jettoptx" ? 18 : 14;
            const clipId = `moa-avatar-${node.id}`;
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => onSelectHandle(node.handle)}
              >
                <defs>
                  <clipPath id={clipId}>
                    <circle cx={p.x} cy={p.y} r={r} />
                  </clipPath>
                </defs>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 4}
                  fill="transparent"
                  stroke={
                    selected || hiProof
                      ? "var(--color-augment)"
                      : "transparent"
                  }
                  strokeWidth={2}
                  opacity={0.9}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill="var(--color-elevated)"
                  stroke={
                    selected
                      ? "var(--color-augment)"
                      : "var(--color-border-strong)"
                  }
                  strokeWidth={selected ? 2 : 1}
                />
                {node.avatarUrl ? (
                  <image
                    href={node.avatarUrl}
                    x={p.x - r}
                    y={p.y - r}
                    width={r * 2}
                    height={r * 2}
                    clipPath={`url(#${clipId})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <text
                    x={p.x}
                    y={p.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-fg"
                    style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                  >
                    {monogram(node.handle)}
                  </text>
                )}
                <text
                  x={p.x}
                  y={p.y + r + 12}
                  textAnchor="middle"
                  className="fill-muted"
                  style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                >
                  @{node.handle.length > 12
                    ? `${node.handle.slice(0, 11)}…`
                    : node.handle}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile / tight fallback: edge list */}
      <div className="space-y-2 sm:hidden">
        <p className="text-xs text-subtle">
          Map edges (mobile list). Tap to open proof or node.
        </p>
        <ul className="space-y-1.5">
          {edgeList.map((link) => {
            const proof =
              (link.proofId && proofById.get(link.proofId)) || null;
            const hot = linkIsHot(link.kind);
            return (
              <li key={link.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    hot
                      ? "border-augment/35 bg-augment/8 text-fg"
                      : "border-border bg-surface text-muted"
                  }`}
                  onClick={() => {
                    selectEdge(link);
                    onSelectHandle(link.toHandle);
                  }}
                >
                  <span className="font-mono">
                    @{link.fromHandle} → @{link.toHandle}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      hot
                        ? "border-augment/40 text-augment"
                        : "text-subtle"
                    }
                  >
                    {link.kind}
                  </Badge>
                </button>
                {proof && activeEdgeId === link.id && (
                  <p className="mt-1 px-1 font-mono text-[10px] text-subtle">
                    {formatProofStrip(proof)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-border-strong opacity-60" />
          follow
        </span>
        <span className="inline-flex items-center gap-1.5 text-augment">
          <span className="inline-block h-0.5 w-4 bg-augment" />
          paid / delegate
        </span>
      </div>
    </div>
  );
}
