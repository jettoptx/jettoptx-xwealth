import { useEffect, useState, type ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { AsciiGridBackground } from "@/components/ascii-grid-background";
import { AuthProvider } from "@/lib/auth/provider";
import { ThemeProvider, useTheme } from "@/lib/theme";
import appCss from "@/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        title: "X Wealth · Jett Optical Encryption",
      },
      {
        name: "description",
        content:
          "Link your X Money pay link and QR. Plug agent harnesses (Grok Build, Hermes, Claude) into x402 payments with USDC on Solana. Built for the X Developer E𝕏hibit by Jett Optical Encryption (@jettoptx).",
      },
      { name: "theme-color", content: "#0a0a0c" },
      { property: "og:title", content: "X Wealth · Jett Optical Encryption" },
      {
        property: "og:description",
        content:
          "Agentic X Money pay surface — x402 · USDC · Solana · plugin-and-play harnesses.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand/xwealth-logo.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:creator", content: "@jettoptx" },
      { name: "twitter:image", content: "/brand/xwealth-logo.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Space Mono for code / mono UI only (body + display = self-hosted D-DIN Expanded)
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap",
      },
      {
        rel: "preload",
        href: "/fonts/D-DINExp.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/D-DINExp-Bold.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "48x48" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "icon", href: "/brand/xwealth-logo.png", type: "image/png" },
    ],
    scripts: [
      {
        children: `(function(){try{var t=localStorage.getItem('xwealth-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;}}catch(e){}})();`,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider>
        <AuthProvider>
          <AsciiGridBackground />
          <RootChrome>
            <Outlet />
          </RootChrome>
          <ThemedToaster />
        </AuthProvider>
      </ThemeProvider>
    </RootDocument>
  );
}

function RootChrome({ children }: { children: ReactNode }) {
  const [embed, setEmbed] = useState(false);
  useEffect(() => {
    try {
      setEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
    } catch {
      setEmbed(false);
    }
  }, []);

  if (embed) {
    return (
      <div className="relative z-10 flex h-dvh min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-dvh flex-col pb-16 sm:pb-0">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <MobileNav />
    </div>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="bottom-center"
      offset={{ bottom: "4.5rem" }}
      mobileOffset={{ bottom: "4.5rem" }}
      toastOptions={{
        className: "font-sans border-border bg-surface text-fg",
      }}
    />
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
