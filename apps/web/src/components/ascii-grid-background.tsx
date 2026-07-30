import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";

/**
 * Full-viewport ASCII grid field (soft cursor accent).
 * Self-drawn canvas — sits behind UI only.
 */
const RAMP = " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

export function AsciiGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, mounted } = useTheme();

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let raf = 0;
    let alive = true;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let mx = 0;
    let my = 0;
    let hasPointer = false;
    let t0 = performance.now();

    const CELL = 12;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.max(1, Math.floor(w * dpr));
      canvas!.height = Math.max(1, Math.floor(h * dpr));
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!hasPointer) {
        mx = w * 0.55;
        my = h * 0.4;
      }
    }

    function onMove(e: PointerEvent) {
      mx = e.clientX;
      my = e.clientY;
      hasPointer = true;
    }

    function onLeave() {
      hasPointer = false;
    }

    function hash(col: number, row: number): number {
      const n = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
      return n - Math.floor(n);
    }

    function frame(now: number) {
      if (!alive) return;
      const time = (now - t0) * 0.001;
      const isLight = theme === "light";
      const bg = isLight ? "#f6f6f7" : "#0a0a0c";
      const gridA = isLight ? 0.06 : 0.045;
      const ink = isLight ? [17, 17, 19] : [244, 244, 245];

      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, w, h);

      // Structural grid
      const GRID = 48;
      ctx!.strokeStyle = isLight
        ? `rgba(17,17,19,${gridA})`
        : `rgba(244,244,245,${gridA})`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      for (let x = 0; x <= w + GRID; x += GRID) {
        ctx!.moveTo(x + 0.5, 0);
        ctx!.lineTo(x + 0.5, h);
      }
      for (let y = 0; y <= h + GRID; y += GRID) {
        ctx!.moveTo(0, y + 0.5);
        ctx!.lineTo(w, y + 0.5);
      }
      ctx!.stroke();

      // Very soft edge fade (not a hotspot)
      const vig = ctx!.createRadialGradient(
        w * 0.5,
        h * 0.4,
        h * 0.25,
        w * 0.5,
        h * 0.5,
        h * 1.05,
      );
      vig.addColorStop(
        0,
        isLight ? "rgba(246,246,247,0)" : "rgba(10,10,12,0)",
      );
      vig.addColorStop(
        1,
        isLight ? "rgba(246,246,247,0.35)" : "rgba(10,10,12,0.4)",
      );
      ctx!.fillStyle = vig;
      ctx!.fillRect(0, 0, w, h);

      const cols = Math.ceil(w / CELL) + 1;
      const rows = Math.ceil(h / CELL) + 1;
      // Wide, low-gain lens — no flashlight
      const lensR = Math.max(h, w) * 0.42;
      const lensR2 = lensR * lensR;

      ctx!.font = `500 ${CELL - 1}px "Space Mono", ui-monospace, monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";

      const px = hasPointer ? mx : w * 0.5 + Math.sin(time * 0.22) * w * 0.12;
      const py = hasPointer ? my : h * 0.42 + Math.cos(time * 0.18) * h * 0.08;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * CELL + CELL * 0.5;
          const y = row * CELL + CELL * 0.5;
          const dx = x - px;
          const dy = y - py;
          const d2 = dx * dx + dy * dy;
          // Smooth falloff, capped low so it never "beams"
          const raw = d2 < lensR2 ? 1 - Math.sqrt(d2) / lensR : 0;
          const soft = raw * raw * 0.35; // was ~0.9 gain — now subtle

          const n =
            hash(col, row) * 0.55 +
            0.45 *
              (0.5 +
                0.5 *
                  Math.sin(col * 0.31 + time * 0.55) *
                  Math.cos(row * 0.27 - time * 0.4));
          // Even ambient field + mild cursor boost
          let density = 0.14 + n * 0.2 + soft * 0.28;
          density = Math.max(0, Math.min(1, density));

          if (soft < 0.01 && density < 0.2) continue;

          const ci = Math.min(
            RAMP.length - 1,
            Math.floor(density * (RAMP.length - 1) * 0.85),
          );
          const ch = RAMP[ci]!;
          const alpha =
            (isLight ? 0.07 : 0.06) +
            density * (isLight ? 0.18 : 0.2) +
            soft * 0.12;
          ctx!.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${Math.min(0.45, alpha).toFixed(3)})`;
          ctx!.fillText(ch, x, y);
        }
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [theme, mounted]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}
