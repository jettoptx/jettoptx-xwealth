import { useCallback, useEffect, useRef, useState } from "react";
import {
  personToListing,
  type AugmentListing,
} from "@/lib/augments";
import type { SocialGraphPerson } from "@/lib/x-api";

export type SocialGraphState = {
  source: "seed" | "x-api";
  me: AugmentListing | null;
  following: AugmentListing[];
  followers: AugmentListing[];
  loading: boolean;
  error: string | null;
  moneyProbed: boolean;
  refresh: (opts?: { probeMoney?: boolean }) => Promise<void>;
};

type ApiResponse = {
  me?: SocialGraphPerson | null;
  following?: SocialGraphPerson[];
  followers?: SocialGraphPerson[];
  source?: "x-api";
  error?: string;
  message?: string;
};

/**
 * Fetch live followers + following + best-effort X Money flags.
 * Requires Privy X OAuth access token (users.read + follows.read).
 */
export function useSocialGraph(accessToken: string | null): SocialGraphState {
  const [me, setMe] = useState<AugmentListing | null>(null);
  const [following, setFollowing] = useState<AugmentListing[]>([]);
  const [followers, setFollowers] = useState<AugmentListing[]>([]);
  const [source, setSource] = useState<"seed" | "x-api">("seed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moneyProbed, setMoneyProbed] = useState(false);
  const lastToken = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (opts?: { probeMoney?: boolean }) => {
      if (!accessToken) {
        setSource("seed");
        setMe(null);
        setFollowing([]);
        setFollowers([]);
        setError(null);
        setMoneyProbed(false);
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      const probeMoney = opts?.probeMoney ?? true;

      try {
        const res = await fetch("/api/x/social-graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            limit: 50,
            probeMoney,
          }),
          signal: ac.signal,
        });
        const json = (await res.json()) as ApiResponse;
        if (!res.ok) {
          throw new Error(
            json.message || json.error || `Social graph failed (${res.status})`,
          );
        }
        setMe(json.me ? personToListing(json.me) : null);
        setFollowing((json.following ?? []).map(personToListing));
        setFollowers((json.followers ?? []).map(personToListing));
        setSource("x-api");
        setMoneyProbed(probeMoney);
      } catch (e) {
        if (ac.signal.aborted) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        setSource("seed");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (accessToken === lastToken.current) return;
    lastToken.current = accessToken;
    void refresh({ probeMoney: true });
    return () => {
      abortRef.current?.abort();
    };
  }, [accessToken, refresh]);

  return {
    source,
    me,
    following,
    followers,
    loading,
    error,
    moneyProbed,
    refresh,
  };
}
