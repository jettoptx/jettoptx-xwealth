import { useId, type ReactNode } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Official X (Twitter) mark — monochrome, inherits currentColor */
export function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

export function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Official Apple mark — solid fill for dark UI */
export function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="#f5f5f7"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.37 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

/** Official GitHub mark — solid fill for dark UI */
export function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="#f0f6fc"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

/** Mail / email — filled envelope for dark login rows */
export function MailLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="#e4e4e7">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

/** Phone — filled handset */
export function PhoneLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="#e4e4e7">
      <path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.4 21 3 13.6 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

/** Wallet — filled mark (wallet connect style) */
export function WalletLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="#e4e4e7">
      <path d="M21 7.28V5c0-1.1-.9-2-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-2.28A2 2 0 0 0 22 15V9a2 2 0 0 0-1-1.72zM20 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z" />
      <circle cx="16" cy="12" r="1.25" fill="#0a0a0c" />
    </svg>
  );
}

/** Fixed dark-UI icon plate so method logos always read next to label */
export function AuthMethodIcon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]",
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

/**
 * Official Circle USDC mark — inline SVG so it always renders (no asset 404).
 * Brand blue #2775CA.
 */
export function UsdcLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 2000 2000"
      aria-hidden
      className={cn("shrink-0", className)}
      fill="none"
    >
      <path
        d="M1000 2000c554.17 0 1000-445.83 1000-1000S1554.17 0 1000 0 0 445.83 0 1000s445.83 1000 1000 1000z"
        fill="#2775CA"
      />
      <path
        d="M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z"
        fill="#fff"
      />
      <path
        d="M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z"
        fill="#fff"
      />
    </svg>
  );
}

/**
 * Official Solana three-bar mark — inline gradient SVG.
 */
export function SolanaLogo({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g1 = `sol-g1-${uid}`;
  const g2 = `sol-g2-${uid}`;
  const g3 = `sol-g3-${uid}`;
  return (
    <svg
      viewBox="0 0 397.7 311.7"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={g1} x1="360.88" y1="351.46" x2="141.21" y2="-69.29" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1 0 0 -1 0 314)">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id={g2} x1="264.83" y1="401.6" x2="45.16" y2="-19.15" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1 0 0 -1 0 314)">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id={g3} x1="312.55" y1="376.69" x2="92.88" y2="-44.06" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1 0 0 -1 0 314)">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${g1})`}
        d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
      />
      <path
        fill={`url(#${g2})`}
        d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
      />
      <path
        fill={`url(#${g3})`}
        d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
      />
    </svg>
  );
}

/**
 * Settlement-rail pill: Circle USDC + Solana logos in the header.
 */
export function UsdcSolanaRail({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-elevated/80 font-semibold text-fg shadow-sm backdrop-blur-sm",
        compact
          ? "gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs"
          : "gap-2 px-3 py-1.5 text-xs sm:text-sm",
        className,
      )}
      title="USDC on Solana"
    >
      <span className="inline-flex items-center gap-1.5">
        <UsdcLogo className={compact ? "h-4 w-4" : "h-5 w-5"} />
        <span className="tracking-wide">USDC</span>
      </span>
      <span className="select-none text-subtle" aria-hidden>
        |
      </span>
      <span className="inline-flex items-center gap-1.5">
        <SolanaLogo className={compact ? "h-3.5 w-4" : "h-4 w-5"} />
        <span className="tracking-wide">Solana</span>
      </span>
    </span>
  );
}

/**
 * Official Privy mark (auth.privy.io favicon icon.svg).
 * Lavender plate + charcoal “person” glyph.
 */
export function PrivyLogo({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/brand/privy-icon.svg"
      alt="Privy"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-xl", className)}
      decoding="async"
    />
  );
}

/** Inline SVG version for monochrome / CSS sizing contexts */
export function PrivyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 600"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="600" height="600" rx="60" fill="#C4D4F6" />
      <path
        d="M300 416.233C389.456 416.233 462 343.689 462 254.233C462 164.776 389.456 92.2326 300 92.2326C210.544 92.2326 138 164.776 138 254.233C138 343.689 210.544 416.233 300 416.233Z"
        fill="#010110"
      />
      <path
        d="M300 510.42C361.139 510.42 410.711 499.987 410.711 487.189C410.711 474.391 361.171 463.958 300 463.958C238.829 463.958 189.289 474.391 189.289 487.189C189.289 499.987 238.829 510.42 300 510.42Z"
        fill="#010110"
      />
    </svg>
  );
}

/**
 * Header / product mark — Jett Optical Encryption zia (jtx-dao).
 * Used in site header, login, home hero — not the isometric cube.
 */
export function JtxMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/jtx-dao.jpg"
      alt="Jett Optical Encryption"
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}

/**
 * Official JTX isometric cube mark (Web4 constellation / product monogram).
 * Light mode: black cube · Dark mode: white cube
 */
export function JtxCubeMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  const { theme, mounted } = useTheme();
  const src =
    theme === "light"
      ? "/brand/jtx-logo-light.png"
      : "/brand/jtx-logo-dark.png";

  if (!mounted) {
    return (
      <span
        className={className}
        style={{
          width: size,
          height: size,
          display: "inline-block",
        }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt="JTX"
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}

export function OptxBadge({
  className,
  height = 28,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <img
      src="/optx-badge.png"
      alt="OPTX"
      height={height}
      width={Math.round(height * 1.6)}
      className={cn("object-contain", className)}
      style={{ height, width: "auto", maxHeight: height }}
      decoding="async"
    />
  );
}

/** JETT OPT wordmark — dark-on-white for light theme, light-on-black for dark */
export function JettOptWordmark({
  className,
  height = 40,
}: {
  className?: string;
  height?: number;
}) {
  const { theme, mounted } = useTheme();
  const src =
    theme === "light"
      ? "/jett-opt-wordmark-light.jpg"
      : "/jett-opt-wordmark-dark.jpg";

  if (!mounted) {
    return (
      <span
        className={className}
        style={{ height, width: height * 3.2, display: "inline-block" }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt="Jett Opt"
      height={height}
      className={cn("object-contain", className)}
      style={{
        height,
        width: "auto",
        maxHeight: height,
        maxWidth: "min(300px, 72vw)",
      }}
      decoding="async"
    />
  );
}
