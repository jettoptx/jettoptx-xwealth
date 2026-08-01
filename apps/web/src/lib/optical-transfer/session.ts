/**
 * OpticalReceiveSession — feed successive QR frame bytes; emit complete payload.
 *
 * Compatible with Decimen senders (magic 0xD1 0x0C). Also accepts barcode
 * `data` strings from expo-camera (latin1 / charCode byte packing).
 */
import { LTDecoder, OVERHEAD_EST } from "./fountain";
import {
  fnv1a,
  looksLikeOpticalFrame,
  parseFrame,
  type FrameHeader,
} from "./protocol";
import { decodeOpticalEnvelope, type OpticalEnvelope } from "./payload";

export type OpticalProgress = {
  sessionId: number;
  framesNew: number;
  framesDup: number;
  k: number;
  /** 0..1 estimated from frames collected (not blocks solved). */
  progress: number;
  totalLen: number;
};

export type OpticalComplete = {
  payload: Uint8Array;
  header: FrameHeader;
  hashOk: boolean;
  envelope: OpticalEnvelope | null;
};

/** Convert expo-camera / zxing string payload → raw bytes. */
export function barcodeDataToBytes(data: string): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data.charCodeAt(i) & 0xff;
  }
  return out;
}

export class OpticalReceiveSession {
  private decoder: LTDecoder | null = null;
  private sessionId = 0;
  private lastHeader: FrameHeader | null = null;
  private complete: OpticalComplete | null = null;

  get isComplete(): boolean {
    return this.complete != null;
  }

  get result(): OpticalComplete | null {
    return this.complete;
  }

  getProgress(): OpticalProgress | null {
    if (!this.decoder || !this.lastHeader) return null;
    return {
      sessionId: this.sessionId,
      framesNew: this.decoder.framesNew,
      framesDup: this.decoder.framesDup,
      k: this.decoder.k,
      progress: Math.min(
        0.99,
        this.decoder.framesNew / (this.decoder.k * OVERHEAD_EST),
      ),
      totalLen: this.decoder.totalLen,
    };
  }

  /**
   * Ingest one decoded QR payload. Returns:
   *  - "ignore" if not optical / incomplete
   *  - "progress" if frame accepted
   *  - "complete" when fountain + hash done
   */
  ingest(bytes: Uint8Array): "ignore" | "progress" | "complete" {
    if (this.complete) return "complete";
    if (!looksLikeOpticalFrame(bytes)) return "ignore";
    const parsed = parseFrame(bytes);
    if (!parsed) return "ignore";
    const { header, block } = parsed;

    if (!this.decoder || this.sessionId !== header.sessionId) {
      this.decoder = new LTDecoder(
        header.k,
        header.blockLen,
        header.sessionId,
        header.totalLen,
      );
      this.sessionId = header.sessionId;
    }
    this.lastHeader = header;
    this.decoder.addFrame(header.seq, block);

    if (!this.decoder.isComplete) return "progress";

    const payload = this.decoder.assemble()!;
    const hashOk = fnv1a(payload) === header.payloadFnv;
    this.complete = {
      payload,
      header,
      hashOk,
      envelope: decodeOpticalEnvelope(payload),
    };
    return "complete";
  }

  ingestBarcodeString(data: string): "ignore" | "progress" | "complete" {
    return this.ingest(barcodeDataToBytes(data));
  }

  reset(): void {
    this.decoder = null;
    this.sessionId = 0;
    this.lastHeader = null;
    this.complete = null;
  }
}
