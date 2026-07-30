import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useOAuthTokens } from "@privy-io/react-auth";
import { privyEnabled } from "./privy";

const STORAGE_KEY = "xwealth:x-oauth-v1";

type StoredXToken = {
  accessToken: string;
  /** epoch ms when we should re-prompt reauthorize */
  expiresAt: number;
  scopes?: string[];
};

type XOAuthContextValue = {
  /** X (Twitter) user access token for follows.read / users.read */
  accessToken: string | null;
  /** True while waiting for reauthorize / first grant */
  isRequesting: boolean;
  /** Persist / clear helpers */
  clearToken: () => void;
  /**
   * Ask Privy to re-authorize X so we receive a fresh OAuth access token.
   * Required when the user signed in before token capture was mounted.
   */
  requestXToken: () => Promise<void>;
  /** Last error from reauthorize */
  error: string | null;
};

const XOAuthContext = createContext<XOAuthContextValue>({
  accessToken: null,
  isRequesting: false,
  clearToken: () => undefined,
  requestXToken: async () => undefined,
  error: null,
});

function readStored(): StoredXToken | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredXToken;
    if (!parsed?.accessToken || typeof parsed.accessToken !== "string") return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(token: StoredXToken | null) {
  if (typeof window === "undefined") return;
  try {
    if (!token) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
  } catch {
    /* ignore quota */
  }
}

function XOAuthInner({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return readStored()?.accessToken ?? null;
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistGrant = useCallback(
    (grant: {
      accessToken?: string;
      accessTokenExpiresInSeconds?: number;
      scopes?: string[];
    }) => {
      if (!grant.accessToken || grant.accessToken.length < 20) return;
      const ttlSec =
        typeof grant.accessTokenExpiresInSeconds === "number" &&
        grant.accessTokenExpiresInSeconds > 0
          ? grant.accessTokenExpiresInSeconds
          : 60 * 60 * 2; // default 2h if provider omits
      const stored: StoredXToken = {
        accessToken: grant.accessToken,
        expiresAt: Date.now() + ttlSec * 1000 - 30_000,
        scopes: grant.scopes,
      };
      writeStored(stored);
      setAccessToken(grant.accessToken);
      setError(null);
      setIsRequesting(false);
    },
    [],
  );

  const { reauthorize } = useOAuthTokens({
    onOAuthTokenGrant: (payload: {
      oAuthTokens?: {
        provider?: string;
        accessToken?: string;
        accessTokenExpiresInSeconds?: number;
        scopes?: string[];
      };
      provider?: string;
      accessToken?: string;
      accessTokenExpiresInSeconds?: number;
      scopes?: string[];
    }) => {
      // Privy docs nest under oAuthTokens; tolerate flat shape too
      const t = payload.oAuthTokens ?? payload;
      const provider = t.provider;
      if (provider && provider !== "twitter") return;
      // If provider omitted but we got a token during X login, still store
      if (!t.accessToken) return;
      if (provider === "twitter" || !provider) {
        persistGrant(t);
      }
    },
  });

  const clearToken = useCallback(() => {
    writeStored(null);
    setAccessToken(null);
  }, []);

  const requestXToken = useCallback(async () => {
    setIsRequesting(true);
    setError(null);
    try {
      // Re-auth X so onOAuthTokenGrant fires with a usable access token
      await reauthorize({ provider: "twitter" as const });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setIsRequesting(false);
    }
  }, [reauthorize]);

  // Hydrate from session on mount (SSR-safe)
  useEffect(() => {
    const s = readStored();
    if (s?.accessToken) setAccessToken(s.accessToken);
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      isRequesting,
      clearToken,
      requestXToken,
      error,
    }),
    [accessToken, isRequesting, clearToken, requestXToken, error],
  );

  return (
    <XOAuthContext.Provider value={value}>{children}</XOAuthContext.Provider>
  );
}

/** No-op provider when Privy is disabled. */
function XOAuthStub({ children }: { children: ReactNode }) {
  const value = useMemo<XOAuthContextValue>(
    () => ({
      accessToken: null,
      isRequesting: false,
      clearToken: () => undefined,
      requestXToken: async () => undefined,
      error: null,
    }),
    [],
  );
  return (
    <XOAuthContext.Provider value={value}>{children}</XOAuthContext.Provider>
  );
}

/**
 * Mount inside PrivyProvider so X OAuth grants are captured app-wide
 * (login return path + reauthorize from /augments).
 */
export function XOAuthTokenProvider({ children }: { children: ReactNode }) {
  if (!privyEnabled) {
    return <XOAuthStub>{children}</XOAuthStub>;
  }
  return <XOAuthInner>{children}</XOAuthInner>;
}

export function useXOAuthAccess(): XOAuthContextValue {
  return useContext(XOAuthContext);
}
