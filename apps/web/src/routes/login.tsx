import { useState } from "react";
import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { ChevronDown, Mail, Wallet } from "lucide-react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { privyEnabled } from "@/lib/auth/privy";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GoogleLogo,
  JtxMark,
  PrivyMark,
  XLogo,
} from "@/components/brand-icons";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();

  if (!isPending && user) {
    return <Navigate to="/console" />;
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

      <Card className="bg-surface shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Link your X handle</CardTitle>
          <CardDescription>
            Sign in with X to bind this wealth console to your official handle.
            Then paste your X Money pay link so agent harnesses can settle x402
            into your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {privyEnabled ? (
            <PrivyLoginPanel />
          ) : authEnabled ? (
            <BetterAuthLoginPanel />
          ) : (
            <p className="text-sm text-muted">
              Sign-in is disabled in this environment.
            </p>
          )}
          <div className="flex flex-col items-center gap-2 pt-3">
            {privyEnabled && (
              <div className="flex items-center gap-1.5 text-[11px] text-subtle">
                <PrivyMark className="size-4 rounded-md" />
                <span>Powered by Privy · OPTX identity</span>
              </div>
            )}
            <p className="text-center text-xs text-subtle">
              Jett Optical Encryption ·{" "}
              <Link
                to="/"
                className="text-muted underline-offset-2 hover:underline"
              >
                Back
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function PrivyLoginPanel() {
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin({
    onComplete: () => {
      // Soft navigate — hard reload during wallet create was part of the loop
      if (typeof window !== "undefined") {
        window.location.assign("/console");
      }
    },
  });
  const [showOther, setShowOther] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Already authenticated → leave login (no wallet wait)
  if (authenticated) {
    return <Navigate to="/console" />;
  }

  async function start(
    method: "twitter" | "email" | "wallet" | "google" | "apple",
  ) {
    if (!ready) return;
    setBusy(method);
    try {
      login({ loginMethods: [method] });
    } finally {
      window.setTimeout(() => setBusy(null), 800);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        variant="default"
        className="w-full gap-2 text-base"
        disabled={!ready || busy === "twitter"}
        onClick={() => void start("twitter")}
      >
        <XLogo className="size-4" />
        Continue with X
      </Button>

      <button
        type="button"
        onClick={() => setShowOther((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted transition-colors hover:bg-elevated hover:text-fg"
      >
        Other options
        <ChevronDown
          className={`size-3.5 transition-transform ${showOther ? "rotate-180" : ""}`}
        />
      </button>

      {showOther && (
        <div className="space-y-2 rounded-xl border border-border bg-bg/60 p-2">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full gap-2"
            disabled={!ready}
            onClick={() => void start("email")}
          >
            <Mail className="size-4" />
            Email
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full gap-2"
            disabled={!ready}
            onClick={() => void start("wallet")}
          >
            <Wallet className="size-4" />
            Wallet
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full gap-2"
            disabled={!ready}
            onClick={() => void start("google")}
          >
            <GoogleLogo className="size-4" />
            Google
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full gap-2"
            disabled={!ready}
            onClick={() => void start("apple")}
          >
            <AppleGlyph className="size-4" />
            Apple
          </Button>
        </div>
      )}
    </div>
  );
}

function BetterAuthLoginPanel() {
  const providers = [...GROK_PROVIDERS].sort((a, b) =>
    a.idp === "twitter" ? -1 : b.idp === "twitter" ? 1 : 0,
  );

  return (
    <>
      {providers.map((p) => {
        const isX = p.idp === "twitter";
        return (
          <Button
            key={p.providerId}
            type="button"
            size="lg"
            variant={isX ? "default" : "secondary"}
            className="w-full gap-2"
            onClick={() =>
              void signIn(p.providerId, { callbackURL: "/console" })
            }
          >
            {isX ? (
              <XLogo className="size-4" />
            ) : (
              <GoogleLogo className="size-4" />
            )}
            Continue with {isX ? "X" : p.label}
          </Button>
        );
      })}
    </>
  );
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.03-.9.97-2.4 1.72-3.68 1.62-.16-1.1.4-2.26 1.17-3.08.9-.96 2.45-1.66 3.71-1.57zM20.5 17.2c-.58 1.34-.86 1.93-1.61 3.11-1.04 1.64-2.51 3.68-4.33 3.7-1.62.02-2.04-1.06-4.24-1.05-2.2.01-2.67 1.07-4.29 1.05-1.82-.02-3.21-1.86-4.25-3.5C.35 17.95-.7 13.2 1.18 10.02c1.17-1.98 3.02-3.23 4.76-3.23 1.77 0 2.88 1.08 4.34 1.08 1.41 0 2.27-1.09 4.35-1.09 1.55 0 3.19.84 4.36 2.3-3.83 2.1-3.21 7.57.51 8.12z" />
    </svg>
  );
}
