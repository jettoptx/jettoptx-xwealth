import { useState, type ReactNode } from "react";
import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { ChevronDown } from "lucide-react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import {
  PRIVY_LOGIN_OTHER,
  type PrivyOtherMethod,
  privyEnabled,
} from "@/lib/auth/privy";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  AppleLogo,
  AuthMethodIcon,
  GitHubLogo,
  GoogleLogo,
  JtxMark,
  MailLogo,
  PhoneLogo,
  UsdcSolanaRail,
  WalletLogo,
  XLogo,
} from "@/components/brand-icons";
import { SIGN_WITH_OPTX } from "@/lib/brand";
import { postLoginHref } from "@/lib/optx-links";

/** Single-line labels only — no "Jett Optics · Google" spam under each method. */
const OTHER_METHOD_META: Record<
  PrivyOtherMethod,
  { label: string; icon: ReactNode }
> = {
  google: {
    label: "Continue with Google",
    icon: (
      <AuthMethodIcon>
        <GoogleLogo className="size-4" />
      </AuthMethodIcon>
    ),
  },
  apple: {
    label: "Continue with Apple",
    icon: (
      <AuthMethodIcon>
        <AppleLogo className="size-4" />
      </AuthMethodIcon>
    ),
  },
  github: {
    label: "Continue with GitHub",
    icon: (
      <AuthMethodIcon>
        <GitHubLogo className="size-4" />
      </AuthMethodIcon>
    ),
  },
  wallet: {
    label: "Continue with wallet",
    icon: (
      <AuthMethodIcon>
        <WalletLogo className="size-4" />
      </AuthMethodIcon>
    ),
  },
  email: {
    label: "Continue with email",
    icon: (
      <AuthMethodIcon>
        <MailLogo className="size-4" />
      </AuthMethodIcon>
    ),
  },
  sms: {
    label: "Continue with phone",
    icon: (
      <AuthMethodIcon>
        <PhoneLogo className="size-4" />
      </AuthMethodIcon>
    ),
  },
};

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

/**
 * Login card matches apps/web OptxSignInModal:
 * Sign with OPT𝕏 · Continue with [X logo] · Other options dropdown · Privy lockup
 */
function LoginPage() {
  const { user, isPending } = useCurrentUserState();

  if (!isPending && user) {
    // Post-login home = dojo
    return <Navigate to="/dojo" />;
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-2">
        <JtxMark
          size={56}
          className="h-14 w-14 rounded-xl border border-border bg-surface object-cover shadow-sm ring-1 ring-border/60"
        />
        <span className="text-[11px] font-medium tracking-wide text-subtle">
          Jett Optical Encryption
        </span>
      </div>

      {/* OPTX card — same visual language as localhost Sign with OPTX modal */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-8 sm:py-8"
        role="dialog"
        aria-labelledby="optx-login-title"
      >
        {/* Corner marks */}
        <div className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-white/20" />
        <div className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-white/20" />
        <div className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-white/20" />
        <div className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-white/20" />

        <h1
          id="optx-login-title"
          className="text-[26px] font-semibold leading-[1.15] tracking-tight text-white sm:text-[28px]"
        >
          {SIGN_WITH_OPTX}
        </h1>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
          X Wealth · Privy
        </p>
        <p className="mt-4 text-[13px] leading-relaxed text-white/55">
          Primary path is <strong className="text-white/85">X OAuth</strong> to
          bind this wealth console to your official @handle. Then paste your X
          Money pay link so agent harnesses can settle x402 into your account.
        </p>

        <div className="mt-4 flex justify-center sm:justify-start">
          <UsdcSolanaRail />
        </div>

        <div className="mt-7">
          {privyEnabled ? (
            <PrivyLoginPanel />
          ) : authEnabled ? (
            <BetterAuthLoginPanel />
          ) : (
            <p className="text-sm text-white/50">
              Sign-in is disabled in this environment.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          {privyEnabled && (
            <img
              src="/brand/privy-protected-lockup-white.svg"
              alt="Protected by Privy"
              className="h-3.5 w-auto max-w-[min(100%,220px)] opacity-90 sm:h-4"
              draggable={false}
            />
          )}
          <p className="text-center text-[11px] text-white/35">
            Jett Optical Encryption ·{" "}
            <Link
              to="/"
              className="text-white/50 underline-offset-2 hover:text-white/70 hover:underline"
            >
              Back
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function PrivyLoginPanel() {
  const { ready } = usePrivy();
  const { login } = useLogin({
    onComplete: () => {
      window.location.href = postLoginHref();
    },
  });
  const [showOther, setShowOther] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function start(method: "twitter" | PrivyOtherMethod) {
    if (!ready) return;
    setBusy(method);
    try {
      login({ loginMethods: [method] });
    } finally {
      window.setTimeout(() => setBusy(null), 800);
    }
  }

  return (
    <div className="space-y-0">
      {/* Primary — Continue with + X logo only */}
      <button
        type="button"
        disabled={!ready || busy === "twitter"}
        onClick={() => void start("twitter")}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white py-3.5 text-[14px] font-semibold text-black transition hover:bg-white/95 disabled:opacity-40"
      >
        {!ready || busy === "twitter" ? (
          <span>Loading…</span>
        ) : (
          <>
            <span>Continue with</span>
            <XLogo className="size-4 shrink-0 text-black" />
          </>
        )}
      </button>

      {/* OR */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
          or
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Other Privy methods — Google → Apple → GitHub → Wallet → Email → Phone */}
      <div className="overflow-hidden rounded-xl border border-white/12 bg-white/[0.03]">
        <button
          type="button"
          onClick={() => setShowOther((v) => !v)}
          aria-expanded={showOther}
          className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
        >
          <span className="block text-[13px] font-medium text-white/85">
            Other options
          </span>
          <ChevronDown
            className={`size-4 text-white/40 transition-transform ${showOther ? "rotate-180" : ""}`}
          />
        </button>

        {showOther && (
          <div className="space-y-2 border-t border-white/10 px-3 py-3">
            {PRIVY_LOGIN_OTHER.map((id) => {
              const m = OTHER_METHOD_META[id];
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!ready || busy === id}
                  onClick={() => void start(id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-[#141414] px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-[#1a1a1a] disabled:opacity-40"
                >
                  {m.icon}
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-white/90">
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BetterAuthLoginPanel() {
  const providers = [...GROK_PROVIDERS].sort((a, b) =>
    a.idp === "twitter" ? -1 : b.idp === "twitter" ? 1 : 0,
  );

  return (
    <div className="space-y-2">
      {providers.map((p) => {
        const isX = p.idp === "twitter";
        return (
          <button
            key={p.providerId}
            type="button"
            className={
              isX
                ? "flex w-full items-center justify-center gap-2.5 rounded-xl bg-white py-3.5 text-[14px] font-semibold text-black"
                : "flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-[#141414] py-3 text-[13px] font-medium text-white/90"
            }
            onClick={() =>
              void signIn(p.providerId, { callbackURL: "/dojo" })
            }
          >
            {isX ? (
              <>
                <span>Continue with</span>
                <XLogo className="size-4 text-black" />
              </>
            ) : (
              <>
                <GoogleLogo className="size-4" />
                Continue with {p.label}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
