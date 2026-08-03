import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { usePrivy } from "@privy-io/react-auth";
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  LogOut,
  Moon,
  Settings2,
  Sun,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { avatarProxyUrl, DEFAULT_AVATAR_URL } from "@/lib/auth/profile-image";
import { privyEnabled } from "@/lib/auth/privy";
import { OPTX_LINKS } from "@/lib/optx-links";
import { useTheme } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AppleLogo,
  AuthMethodIcon,
  GitHubLogo,
  GoogleLogo,
  MailLogo,
  PhoneLogo,
  WalletLogo,
  XLogo,
} from "@/components/brand-icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

/** Connection methods we surface (matches Privy loginMethods on the shell). */
const CONNECTION_DEFS = [
  {
    id: "twitter",
    label: "X (Twitter)",
    accountTypes: ["twitter_oauth", "twitter"],
    primary: true,
  },
  {
    id: "google",
    label: "Google",
    accountTypes: ["google_oauth", "google"],
  },
  {
    id: "apple",
    label: "Apple",
    accountTypes: ["apple_oauth", "apple"],
  },
  {
    id: "github",
    label: "GitHub",
    accountTypes: ["github_oauth", "github"],
  },
  {
    id: "email",
    label: "Email",
    accountTypes: ["email"],
  },
  {
    id: "sms",
    label: "Phone",
    accountTypes: ["phone", "sms"],
  },
  {
    id: "wallet",
    label: "Wallet",
    accountTypes: ["wallet", "smart_wallet"],
  },
] as const;

type ConnectionId = (typeof CONNECTION_DEFS)[number]["id"];

type LinkedSlice = {
  type: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
  username?: string;
  name?: string;
  subject?: string;
  chainType?: string;
  walletClientType?: string;
};

function SettingsPage() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <main className="flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="h-7 w-36 animate-pulse rounded bg-elevated" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">
          <div className="grid h-full gap-4 lg:grid-cols-2">
            <div className="animate-pulse rounded-xl bg-elevated" />
            <div className="animate-pulse rounded-xl bg-elevated" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return <RedirectToSignIn />;
  }

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden bg-bg/40">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-subtle sm:text-xs">
            Settings
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            <Settings2 className="size-6 text-augment sm:size-7" aria-hidden />
            Account
          </h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Profile, login connections, and appearance for X Wealth.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/dojo">DOJO</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/console">Console</Link>
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <AccountCard />
          <AppearanceCard />
          <div className="lg:col-span-2">
            <LoginConnectionsCard />
          </div>
          <div className="lg:col-span-2">
            <ExternalLinksCard />
          </div>
        </div>
      </div>
    </main>
  );
}

function AccountCard() {
  const { user } = useCurrentUserState();
  if (!user) return null;

  const remote = user.profileImageUrl;
  const proxied = avatarProxyUrl(remote);
  const direct =
    remote && remote !== DEFAULT_AVATAR_URL ? remote : null;
  const src = proxied ?? direct ?? DEFAULT_AVATAR_URL;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          How you appear on xwealth.space after Privy sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          src={src}
          alt=""
          width={72}
          height={72}
          referrerPolicy="no-referrer"
          className="h-16 w-16 rounded-full border border-border bg-black object-cover sm:h-[4.5rem] sm:w-[4.5rem]"
          onError={(e) => {
            const img = e.currentTarget;
            if (direct && !img.dataset.triedDirect) {
              img.dataset.triedDirect = "1";
              img.src = direct;
              return;
            }
            if (!img.dataset.triedDefault) {
              img.dataset.triedDefault = "1";
              img.src = DEFAULT_AVATAR_URL;
            }
          }}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate font-display text-lg font-semibold">
            {user.displayName ?? "Signed in"}
          </p>
          {user.handle ? (
            <p className="font-mono text-sm text-fg">@{user.handle}</p>
          ) : null}
          {user.primaryEmail ? (
            <p className="truncate text-sm text-muted">{user.primaryEmail}</p>
          ) : null}
          {user.walletAddress ? (
            <p className="truncate font-mono text-xs text-muted">
              {shortAddr(user.walletAddress)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {user.isDevFallback ? (
              <Badge variant="warn">Dev fallback</Badge>
            ) : (
              <Badge variant="outline">Privy session</Badge>
            )}
            <Badge variant="outline" className="font-mono text-[10px]">
              id {user.id.slice(0, 8)}…
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoginConnectionsCard() {
  if (!privyEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login connections</CardTitle>
          <CardDescription>
            Privy is disabled in this environment. Enable{" "}
            <code className="text-xs">VITE_PRIVY_APP_ID</code> to manage linked
            accounts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <PrivyConnections />;
}

function PrivyConnections() {
  const {
    ready,
    user,
    logout,
    linkTwitter,
    linkGoogle,
    linkApple,
    linkGithub,
    linkEmail,
    linkPhone,
    linkWallet,
    unlinkTwitter,
    unlinkGoogle,
    unlinkApple,
    unlinkGithub,
    unlinkEmail,
    unlinkPhone,
    unlinkWallet,
  } = usePrivy();
  const [busy, setBusy] = useState<string | null>(null);

  const linked = useMemo(() => {
    const accounts = (user?.linkedAccounts ?? []) as LinkedSlice[];
    const byId: Record<
      ConnectionId,
      { connected: boolean; detail: string | null; raw: LinkedSlice | null }
    > = {
      twitter: { connected: false, detail: null, raw: null },
      google: { connected: false, detail: null, raw: null },
      apple: { connected: false, detail: null, raw: null },
      github: { connected: false, detail: null, raw: null },
      email: { connected: false, detail: null, raw: null },
      sms: { connected: false, detail: null, raw: null },
      wallet: { connected: false, detail: null, raw: null },
    };

    for (const def of CONNECTION_DEFS) {
      const match = accounts.find((a) =>
        (def.accountTypes as readonly string[]).includes(String(a.type ?? "")),
      );
      if (!match) continue;
      byId[def.id] = {
        connected: true,
        detail: connectionDetail(def.id, match),
        raw: match,
      };
    }

    // Also surface top-level Privy shortcuts (sometimes filled without full type match)
    if (user?.twitter?.username && !byId.twitter.connected) {
      byId.twitter = {
        connected: true,
        detail: `@${user.twitter.username.replace(/^@/, "")}`,
        raw: null,
      };
    }
    if (user?.google?.email && !byId.google.connected) {
      byId.google = {
        connected: true,
        detail: user.google.email,
        raw: null,
      };
    }
    if (user?.email?.address && !byId.email.connected) {
      byId.email = {
        connected: true,
        detail: user.email.address,
        raw: null,
      };
    }
    if (user?.wallet?.address && !byId.wallet.connected) {
      byId.wallet = {
        connected: true,
        detail: shortAddr(user.wallet.address),
        raw: null,
      };
    }

    return byId;
  }, [user]);

  const connectedCount = CONNECTION_DEFS.filter(
    (d) => linked[d.id].connected,
  ).length;

  async function connect(id: ConnectionId) {
    if (!ready) return;
    setBusy(`link:${id}`);
    try {
      switch (id) {
        case "twitter":
          linkTwitter();
          break;
        case "google":
          linkGoogle();
          break;
        case "apple":
          linkApple();
          break;
        case "github":
          linkGithub();
          break;
        case "email":
          linkEmail();
          break;
        case "sms":
          linkPhone();
          break;
        case "wallet":
          linkWallet();
          break;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open linker");
    } finally {
      window.setTimeout(() => setBusy(null), 900);
    }
  }

  async function disconnect(id: ConnectionId) {
    if (!ready) return;
    if (connectedCount <= 1) {
      toast.error("Keep at least one login method connected");
      return;
    }
    const row = linked[id];
    if (!row.connected) return;

    setBusy(`unlink:${id}`);
    try {
      const subject =
        row.raw?.subject ??
        row.raw?.address ??
        row.raw?.email ??
        row.raw?.phoneNumber ??
        "";
      switch (id) {
        case "twitter": {
          const sub = user?.twitter?.subject ?? subject;
          if (!sub) throw new Error("Missing X account id");
          await unlinkTwitter(sub);
          break;
        }
        case "google": {
          const sub = user?.google?.subject ?? subject;
          if (!sub) throw new Error("Missing Google subject");
          await unlinkGoogle(sub);
          break;
        }
        case "apple": {
          if (!subject) throw new Error("Missing Apple subject");
          await unlinkApple(subject);
          break;
        }
        case "github": {
          if (!subject) throw new Error("Missing GitHub subject");
          await unlinkGithub(subject);
          break;
        }
        case "email": {
          const addr = user?.email?.address ?? row.raw?.address ?? row.raw?.email;
          if (!addr) throw new Error("Missing email");
          await unlinkEmail(addr);
          break;
        }
        case "sms": {
          const phone = row.raw?.phoneNumber ?? subject;
          if (!phone) throw new Error("Missing phone");
          await unlinkPhone(phone);
          break;
        }
        case "wallet": {
          const addr = row.raw?.address ?? user?.wallet?.address;
          if (!addr) throw new Error("Missing wallet address");
          await unlinkWallet(addr);
          break;
        }
      }
      toast.success(`${labelFor(id)} disconnected`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unlink failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4 text-augment" aria-hidden />
          Login connections
        </CardTitle>
        <CardDescription>
          Same Privy identity as login — link X, Google, Apple, GitHub, email,
          phone, or a wallet. Unlink needs at least one method left.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!ready ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Loading Privy…
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {CONNECTION_DEFS.map((def) => {
              const row = linked[def.id];
              const isBusy =
                busy === `link:${def.id}` || busy === `unlink:${def.id}`;
              return (
                <li
                  key={def.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4"
                >
                  <ConnectionIcon id={def.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-fg">
                        {def.label}
                      </span>
                      {"primary" in def && def.primary ? (
                        <Badge variant="outline" className="text-[10px]">
                          Primary
                        </Badge>
                      ) : null}
                      {row.connected ? (
                        <Badge variant="success" className="text-[10px]">
                          <CheckCircle2 className="mr-0.5 size-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Not linked
                        </Badge>
                      )}
                    </div>
                    {row.detail ? (
                      <p className="mt-0.5 truncate font-mono text-xs text-muted">
                        {row.detail}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted">
                        {def.id === "twitter"
                          ? "Recommended for X Money pay links"
                          : "Optional sign-in path"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {row.connected ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!ready || isBusy || connectedCount <= 1}
                        onClick={() => void disconnect(def.id)}
                        title={
                          connectedCount <= 1
                            ? "Keep at least one connection"
                            : `Unlink ${def.label}`
                        }
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Unlink className="size-3.5" />
                        )}
                        <span className="ml-1 hidden sm:inline">Unlink</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!ready || isBusy}
                        onClick={() => void connect(def.id)}
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted"
            onClick={() => {
              void logout().then(() => {
                window.location.href = "/";
              });
            }}
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const { theme, setTheme, mounted } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Theme for this browser (saved as{" "}
          <code className="text-xs">xwealth-theme</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={theme === "dark" ? "default" : "outline"}
          disabled={!mounted}
          onClick={() => setTheme("dark")}
          className={cn(theme === "dark" && "ring-1 ring-augment/40")}
        >
          <Moon className="size-3.5" />
          Dark
        </Button>
        <Button
          type="button"
          size="sm"
          variant={theme === "light" ? "default" : "outline"}
          disabled={!mounted}
          onClick={() => setTheme("light")}
          className={cn(theme === "light" && "ring-1 ring-augment/40")}
        >
          <Sun className="size-3.5" />
          Light
        </Button>
      </CardContent>
    </Card>
  );
}

function ExternalLinksCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Related account surfaces</CardTitle>
        <CardDescription>
          Full chat wallet/security lives on JettChat. Trade desk prefs live on
          app.jtx.com — we do not clone those UIs here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild size="sm" variant="outline">
          <a
            href={`${OPTX_LINKS.jettchatSettings}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            JettChat account
            <ExternalLink className="size-3" />
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={`${OPTX_LINKS.jettchatSettingsWallet}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            Wallet tab
            <ExternalLink className="size-3" />
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a
            href={OPTX_LINKS.jtxVenue}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-muted"
          >
            Trade desk (app.jtx.com)
            <ExternalLink className="size-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Same local brand marks as /login — inline SVGs from brand-icons. */
function ConnectionIcon({ id }: { id: ConnectionId }) {
  const icon =
    id === "twitter" ? (
      <XLogo className="size-4 text-white" />
    ) : id === "google" ? (
      <GoogleLogo className="size-4" />
    ) : id === "apple" ? (
      <AppleLogo className="size-4" />
    ) : id === "github" ? (
      <GitHubLogo className="size-4" />
    ) : id === "email" ? (
      <MailLogo className="size-4" />
    ) : id === "sms" ? (
      <PhoneLogo className="size-4" />
    ) : (
      <WalletLogo className="size-4" />
    );

  // Fixed dark plate so Apple/GitHub light fills stay readable in light theme.
  return (
    <AuthMethodIcon className="size-9 rounded-md border-white/15 bg-[#141416]">
      {icon}
    </AuthMethodIcon>
  );
}

function connectionDetail(id: ConnectionId, a: LinkedSlice): string {
  if (id === "twitter") {
    const u = a.username?.replace(/^@/, "");
    return u ? `@${u}` : a.name || a.subject || "Connected";
  }
  if (id === "wallet") {
    const chain = a.chainType ? ` · ${a.chainType}` : "";
    const client = a.walletClientType ? ` · ${a.walletClientType}` : "";
    return a.address
      ? `${shortAddr(a.address)}${chain}${client}`
      : "Wallet linked";
  }
  if (id === "sms") return a.phoneNumber || a.address || "Phone linked";
  if (id === "email") return a.address || a.email || "Email linked";
  return a.email || a.name || a.username || a.subject || "Connected";
}

function labelFor(id: ConnectionId): string {
  return CONNECTION_DEFS.find((d) => d.id === id)?.label ?? id;
}

function shortAddr(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
