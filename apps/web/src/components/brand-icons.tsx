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
      className={className}
      style={{ height, width: "auto" }}
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
      className={className}
      style={{ height, width: "auto", maxWidth: "min(300px, 72vw)" }}
      decoding="async"
    />
  );
}
