export {
  HEADER_LEN,
  packFrame,
  parseFrame,
  looksLikeOpticalFrame,
  fnv1a,
  splitmix32,
  type FrameHeader,
} from "./protocol";
export { LTEncoder, LTDecoder, OVERHEAD_EST } from "./fountain";
export {
  encodeOpticalEnvelope,
  decodeOpticalEnvelope,
  type OpticalEnvelope,
  type OpticalKind,
  type OpticalLoginChallenge,
  type OpticalSignTxChallenge,
} from "./payload";
export {
  OpticalReceiveSession,
  barcodeDataToBytes,
  type OpticalProgress,
  type OpticalComplete,
} from "./session";

/** Defaults matching Decimen PoC tuning. */
export const OPTICAL_DEFAULTS = {
  txFps: 24,
  /** QR v27 capacity at ECC L ≈ 1465 raw bytes/frame including header. */
  frameBytes: 1465,
  /** QR v40 ceiling — close-range only. */
  frameBytesV40: 2953,
  ecc: "L" as const,
  maskPattern: 4 as const,
};
