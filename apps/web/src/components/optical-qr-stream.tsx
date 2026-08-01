/**
 * OpticalQrStream — Decimen-style animated fountain QR sender (X Wealth).
 * Mirrored protocol: @/lib/optical-transfer (same as Mojo / jettchat).
 */
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  HEADER_LEN,
  LTEncoder,
  OPTICAL_DEFAULTS,
  encodeOpticalEnvelope,
  fnv1a,
  packFrame,
  type FrameHeader,
  type OpticalEnvelope,
} from "@/lib/optical-transfer";

type Props = {
  envelope: OpticalEnvelope;
  frameBytes?: number;
  fps?: number;
  sizeCssPx?: number;
  className?: string;
};

export function OpticalQrStream({
  envelope,
  frameBytes = OPTICAL_DEFAULTS.frameBytes,
  fps = OPTICAL_DEFAULTS.txFps,
  sizeCssPx = 280,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [specs, setSpecs] = useState("starting…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let raf = 0;
    let pumpTimer: ReturnType<typeof setTimeout> | null = null;
    let gen = 0;
    gen++;
    const myGen = gen;

    (async () => {
      try {
        const payload = encodeOpticalEnvelope(envelope);
        const sessionId = (Math.floor(Math.random() * 0xffff) + 1) & 0xffff;
        const blockLen = frameBytes - HEADER_LEN;
        const encoder = new LTEncoder(payload, blockLen, sessionId);
        const header: FrameHeader = {
          sessionId,
          seq: 0,
          k: encoder.k,
          blockLen,
          totalLen: payload.length,
          payloadFnv: fnv1a(payload),
        };

        let version: number | undefined;
        let modules = 0;
        let scale = 1;
        const staging = document.createElement("canvas");
        const queue: ImageData[] = [];
        let nextSeq = 0;
        const MARGIN = 4;

        const sizeCanvas = () => {
          const dpr = window.devicePixelRatio || 1;
          const total = modules + 2 * MARGIN;
          scale = Math.max(1, Math.floor((sizeCssPx * dpr) / total));
          staging.width = total;
          staging.height = total;
          canvas.width = total * scale;
          canvas.height = total * scale;
          canvas.style.width = `${(total * scale) / dpr}px`;
          canvas.style.height = `${(total * scale) / dpr}px`;
        };

        const makeFrame = (): ImageData => {
          const bytes = packFrame(
            { ...header, seq: nextSeq },
            encoder.encode(nextSeq),
          );
          nextSeq++;
          const qr = QRCode.create(
            [{ data: bytes, mode: "byte" } as unknown as QRCode.QRCodeSegment],
            {
              errorCorrectionLevel: OPTICAL_DEFAULTS.ecc,
              version,
              maskPattern: OPTICAL_DEFAULTS.maskPattern,
            },
          );
          if (version === undefined) {
            version = qr.version;
            modules = qr.modules.size;
            sizeCanvas();
            setSpecs(
              `${fps} FPS · ${frameBytes} B · V${version} · ${payload.length} B · K=${encoder.k}`,
            );
          }
          const size = qr.modules.size;
          const data = qr.modules.data;
          const total = size + 2 * MARGIN;
          const img = new ImageData(total, total);
          const px = new Uint32Array(img.data.buffer);
          px.fill(0xffffffff);
          for (let y = 0; y < size; y++) {
            const row = (y + MARGIN) * total + MARGIN;
            const src = y * size;
            for (let x = 0; x < size; x++) {
              if (data[src + x]) px[row + x] = 0xff000000;
            }
          }
          return img;
        };

        const pump = () => {
          if (cancelled || myGen !== gen) return;
          try {
            while (queue.length < 3) queue.push(makeFrame());
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            return;
          }
          pumpTimer = setTimeout(pump, 0);
        };
        pump();

        const interval = 1000 / fps;
        let nextAt = performance.now();
        const tick = (now: number) => {
          if (cancelled || myGen !== gen) return;
          raf = requestAnimationFrame(tick);
          if (now < nextAt) return;
          const img = queue.shift();
          if (!img) {
            nextAt = now + interval;
            return;
          }
          staging.getContext("2d")!.putImageData(img, 0, 0);
          const ctx = canvas.getContext("2d")!;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(staging, 0, 0, canvas.width, canvas.height);
          nextAt += interval;
          if (now - nextAt > 3 * interval) nextAt = now + interval;
        };
        raf = requestAnimationFrame(tick);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      gen++;
      cancelAnimationFrame(raf);
      if (pumpTimer) clearTimeout(pumpTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(envelope), frameBytes, fps, sizeCssPx]);

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-2">
        <canvas ref={canvasRef} className="rounded-xl bg-white" />
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          {error ? `✗ ${error}` : specs}
        </p>
      </div>
    </div>
  );
}
