/**
 * Privy config for X Wealth (Jett Optical Encryption).
 * Primary identity for E𝕏hibit: X (Twitter). Other methods under "Other options".
 *
 * App ID from jtx.astroknots.space / Privy dashboard.
 * Allowed origins must include: localhost, sandbox hosts, xwealth.space
 */
export const PRIVY_APP_ID =
  (import.meta.env.VITE_PRIVY_APP_ID as string | undefined)?.trim() ||
  "cmoq24szk00by0dl5abm0ss19";

/** When true, session + login use Privy (production path for Spacetime / OPTX). */
export const privyEnabled =
  Boolean(PRIVY_APP_ID) && import.meta.env.VITE_PRIVY_ENABLED !== "false";

export const PRIVY_LOGIN_PRIMARY = "twitter" as const;

export const PRIVY_LOGIN_OTHER = [
  "email",
  "wallet",
  "google",
  "apple",
] as const;

export type PrivyOtherMethod = (typeof PRIVY_LOGIN_OTHER)[number];
