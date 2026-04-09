import { SharedRuntime } from "@/components/shared-runtime";
import { WidgetDemo } from "@/components/widget-demo";
import { SandboxDemo } from "@/components/sandbox-demo";
import { CodeBlock } from "@/components/code-block";
import { HeroSectionLinks } from "@/components/hero-section-links";
import { Separator } from "@/components/ui/separator";

const installCmd =
  "pnpm add turnkey-wagmi-connector wagmi @wagmi/core viem @tanstack/react-query @turnkey/react-wallet-kit";

const envVars = `NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=...
NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID=...
NEXT_PUBLIC_REOWN_PROJECT_ID=...
NEXT_PUBLIC_BASE_RPC_URL=...
NEXT_PUBLIC_ARBITRUM_RPC_URL=...
NEXT_PUBLIC_OPTIMISM_RPC_URL=...`;

const providerExample = `"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, mainnet } from "viem/chains";
import {
  TurnkeySessionProvider,
  TurnkeyWagmiBridge,
  createTurnkeyConnector,
} from "turnkey-wagmi-connector";

const chains = [mainnet, base] as const;

const turnkeyConnector = createTurnkeyConnector({
  chains,
  walletLabel: "Turnkey Session",
});

const wagmiConfig = createConfig({
  chains,
  connectors: [turnkeyConnector],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});

const queryClient = new QueryClient();

const turnkeyConfig = {
  apiBaseUrl: "https://api.turnkey.com",
  organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
  authProxyConfigId: process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID!,
  auth: {
    autoRefreshSession: false,
    methods: { emailOtpAuthEnabled: true },
    methodOrder: ["email"],
  },
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TurnkeySessionProvider turnkeyConfig={turnkeyConfig}>
        <WagmiProvider config={wagmiConfig}>
          <TurnkeyWagmiBridge />
          {children}
        </WagmiProvider>
      </TurnkeySessionProvider>
    </QueryClientProvider>
  );
}`;

const hookExample = `import { useTurnkeySessionGate } from "turnkey-wagmi-connector";

function MyComponent() {
  const { authState, isSessionValid, connectTurnkey, disconnectAll } =
    useTurnkeySessionGate();

  if (!isSessionValid) {
    return <button onClick={() => connectTurnkey()}>Connect</button>;
  }

  return <p>Session active — {authState}</p>;
}`;

const connectorExample = `import { createTurnkeyConnector } from "turnkey-wagmi-connector";
import { mainnet, base, arbitrum } from "viem/chains";

const turnkeyConnector = createTurnkeyConnector({
  chains: [mainnet, base, arbitrum],
  walletLabel: "Turnkey Embedded",
});`;

const exports = [
  {
    name: "createTurnkeyConnector",
    description:
      "Creates a Wagmi connector backed by the embedded Turnkey EVM wallet. Pass your chains and an optional label.",
  },
  {
    name: "TurnkeySessionProvider",
    description:
      "Wraps @turnkey/react-wallet-kit and syncs Turnkey auth, session, and wallet state into the package runtime.",
  },
  {
    name: "TurnkeyWagmiBridge",
    description:
      "Render once per Wagmi config. Auto-connects after Turnkey auth, refreshes sessions, and disconnects Wagmi connectors when the session expires.",
  },
  {
    name: "useTurnkeySessionGate",
    description:
      "Returns auth state, session validity, reconnect status, connectTurnkey(), refreshSession(), disconnectAll(), and the embedded account.",
  },
  {
    name: "useTurnkeyChainSwitch",
    description:
      "Chain switching that works across both Wagmi 2 and Wagmi 3 with the Turnkey connector.",
  },
  {
    name: "useTurnkeyWalletActions",
    description:
      "Direct Turnkey-backed signing and transaction submission via @turnkey/viem, bypassing generic wallet-provider semantics.",
  },
];

const pitfalls = [
  {
    title: "Duplicate provider packages",
    body: "Your app and the package must share the same React provider instances. If you see errors like 'useConfig must be used within WagmiProvider', you have duplicate wagmi or @turnkey/react-wallet-kit.",
  },
  {
    title: "Turnkey auth is the source of truth",
    body: "Do not treat Wagmi persistence as Turnkey session validity. Turnkey expiry should disable embedded Turnkey flows, but it should not forcibly disconnect an active third-party wallet.",
  },
  {
    title: "External wallet switching",
    body: "An external wallet can become the active Wagmi connector and remain usable while Turnkey is logged out. Only Turnkey-backed actions should be session-gated.",
  },
  {
    title: "SSR and monorepos",
    body: "Pay attention to shared peer dependencies, dynamic routes requiring client-only wallet providers, and transpilePackages if consuming the workspace source.",
  },
];

export default function Home() {
  return (
    <div className="grid gap-16">
      {/* ── Hero ── */}
      <section className="grid gap-5">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          turnkey-wagmi-connector
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
          A Turnkey-backed Wagmi connector that makes the embedded Turnkey EVM
          wallet look like a normal Wagmi wallet. Connect once, bridge the
          session, and reuse the connection in LI.FI, Reown AppKit, or any
          Wagmi-aware tool.
        </p>
        <HeroSectionLinks />
      </section>

      {/* ── Install ── */}
      <section id="install" className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Install</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            The package expects these peers in the consuming app.
          </p>
        </div>
        <CodeBlock code={installCmd} lang="bash" label="Terminal" />
        <div className="text-sm leading-relaxed text-muted-foreground">
          <p>
            Compatibility: <code>wagmi</code> &ge;2.19.5 &lt;4 &middot;{" "}
            <code>viem</code> 2.x &middot; <code>react</code> &ge;18
          </p>
        </div>
      </section>

      <Separator />

      {/* ── Providers ── */}
      <section id="providers" className="grid gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Provider Setup
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Wrap your app with the Turnkey session provider, the Wagmi provider,
            and the bridge. The bridge auto-connects the Turnkey wallet after
            auth and refreshes sessions before expiry.
          </p>
        </div>
        <CodeBlock
          code={providerExample}
          lang="tsx"
          filename="app-providers.tsx"
        />
        <p className="text-sm leading-relaxed text-muted-foreground">
          This demo app additionally wraps Reown AppKit and uses{" "}
          <code>@reown/appkit-adapter-wagmi</code> for external wallet
          switching. See <code>src/components/providers.tsx</code> and{" "}
          <code>src/lib/app-config.ts</code> for the full setup.
        </p>

        <div>
          <p className="mb-2 text-sm font-medium">
            Creating the connector is a one-liner:
          </p>
          <CodeBlock code={connectorExample} lang="tsx" />
        </div>
      </section>

      <Separator />

      {/* ── Env ── */}
      <section id="env" className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Environment Variables
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Configure these in <code>.env.local</code> (or your deployment
            platform). Turnkey org and auth-proxy are required; RPC URLs prevent
            falling back to public endpoints.
          </p>
        </div>
        <CodeBlock code={envVars} lang="bash" filename=".env.local" />
      </section>

      <Separator />

      {/* ── API ── */}
      <section id="api" className="grid gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Exports & API
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Everything the package exposes publicly.
          </p>
        </div>
        <div className="grid gap-3">
          {exports.map((exp) => (
            <div
              key={exp.name}
              className="rounded-lg border bg-card px-4 py-3"
            >
              <p className="font-mono text-sm font-medium">{exp.name}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                {exp.description}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">
            Typical hook usage:
          </p>
          <CodeBlock code={hookExample} lang="tsx" />
        </div>
      </section>

      <Separator />

      {/* ── Pitfalls ── */}
      <section id="pitfalls" className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Common Pitfalls
          </h2>
        </div>
        <div className="grid gap-3">
          {pitfalls.map((p) => (
            <div key={p.title} className="rounded-lg border bg-card px-4 py-3">
              <p className="text-sm font-medium">{p.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Shared Runtime ── */}
      <section id="runtime" className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Live: Shared Runtime
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Connect here once. The same Turnkey, Wagmi, and Reown AppKit state
            persists across all live sections below.
          </p>
        </div>
        <SharedRuntime />
      </section>

      <Separator />

      {/* ── LI.FI Widget ── */}
      <section id="lifi" className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Live: LI.FI Widget
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Proves the published connector drives Wagmi correctly inside the
            LI.FI widget. Connect via the shared runtime above. Use the sandbox
            for chain-switch and message signing.
          </p>
        </div>
        <WidgetDemo />
      </section>

      <Separator />

      {/* ── Sandbox ── */}
      <section id="sandbox" className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Live: Sandbox
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Wagmi chain switch, message signing, and a Base Sepolia native ETH
            send using whichever wallet is connected in the shared runtime.
          </p>
        </div>
        <SandboxDemo />
      </section>

      {/* ── Limitations ── */}
      <section className="grid gap-2 pb-8">
        <h2 className="text-xl font-semibold tracking-tight">Limitations</h2>
        <ul className="list-inside list-disc text-sm leading-relaxed text-muted-foreground">
          <li>First embedded EVM account only</li>
          <li>No account selector</li>
          <li>No Solana support</li>
        </ul>
      </section>
    </div>
  );
}
