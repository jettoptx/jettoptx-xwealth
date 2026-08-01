/**
 * AGT gaze state types + helpers for JettUxOverlay.
 * Gaze math / camera live upstream; exhibit derives weights from MOA selection.
 */

export type AgtId = 'COG' | 'EMO' | 'ENV'

export type AgtWeights = Record<AgtId, number>

export type AgtGazeState = {
  active: AgtId
  weights: AgtWeights
  /** Normalized gaze point (optional; overlay does not paint it) */
  gaze?: { x: number; y: number }
}

export const AGT_COLORS: Record<AgtId, string> = {
  COG: '#fbbf24',
  EMO: '#f43f5e',
  ENV: '#60a5fa',
}

export const AGT_VERTS: Record<AgtId, { x: number; y: number }> = {
  COG: { x: 100, y: 28 },
  EMO: { x: 32, y: 148 },
  ENV: { x: 168, y: 148 },
}

export const AGT_CENTER = { x: 100, y: 108 }

export function normalizeWeights(w: AgtWeights): AgtWeights {
  const s = w.COG + w.EMO + w.ENV
  if (s <= 0) return { COG: 1 / 3, EMO: 1 / 3, ENV: 1 / 3 }
  return { COG: w.COG / s, EMO: w.EMO / s, ENV: w.ENV / s }
}

export function argmaxActive(w: AgtWeights): AgtId {
  const n = normalizeWeights(w)
  if (n.COG >= n.EMO && n.COG >= n.ENV) return 'COG'
  if (n.EMO >= n.ENV) return 'EMO'
  return 'ENV'
}

export function makeAgtState(weights: AgtWeights): AgtGazeState {
  const n = normalizeWeights(weights)
  return { active: argmaxActive(n), weights: n }
}

/** Map MOA node agt key → exhibit weights (0–1 simplex). */
export function weightsFromNodeAgt(
  agt: string | undefined | null,
  id?: string | null,
): AgtWeights {
  if (id === '8-wealth') return { COG: 0.25, EMO: 0.5, ENV: 0.25 }
  if (agt === 'COG') return { COG: 0.62, EMO: 0.18, ENV: 0.2 }
  if (agt === 'EMO') return { COG: 0.22, EMO: 0.55, ENV: 0.23 }
  if (agt === 'ENV') return { COG: 0.2, EMO: 0.22, ENV: 0.58 }
  if (agt === 'ROOT') return { COG: 0.4, EMO: 0.3, ENV: 0.3 }
  return { COG: 1 / 3, EMO: 1 / 3, ENV: 1 / 3 }
}

/** Soft lerp for future live gaze smoothing (alpha ≈ 0.18). */
export function smoothAgtState(
  prev: AgtGazeState,
  next: AgtGazeState,
  alpha = 0.18,
): AgtGazeState {
  const weights: AgtWeights = {
    COG: prev.weights.COG + (next.weights.COG - prev.weights.COG) * alpha,
    EMO: prev.weights.EMO + (next.weights.EMO - prev.weights.EMO) * alpha,
    ENV: prev.weights.ENV + (next.weights.ENV - prev.weights.ENV) * alpha,
  }
  return {
    active: argmaxActive(weights),
    weights: normalizeWeights(weights),
    gaze: next.gaze
      ? {
          x: (prev.gaze?.x ?? next.gaze.x) + (next.gaze.x - (prev.gaze?.x ?? next.gaze.x)) * alpha,
          y: (prev.gaze?.y ?? next.gaze.y) + (next.gaze.y - (prev.gaze?.y ?? next.gaze.y)) * alpha,
        }
      : prev.gaze,
  }
}
