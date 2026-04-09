# turnkey-wagmi-connector

Turnkey Embedded Wallet Kit integration for Wagmi v2 and v3.

This package makes a Turnkey embedded EVM wallet behave like a normal Wagmi connector, keeps Wagmi connection state gated by the Turnkey session, and exposes direct Turnkey-backed wallet helpers when you need to bypass generic provider RPC flows.

## Package Version

The source of truth for package versioning is [`packages/turnkey-wagmi-connector/package.json`](./packages/turnkey-wagmi-connector/package.json).

Current repo version:

- `turnkey-wagmi-connector@0.0.1`

When you cut a release, bump the version there first. The root README should reflect that published version.

## What This Package Solves

- Turnkey authentication and session state stay in `@turnkey/react-wallet-kit`
- the embedded Turnkey EVM wallet becomes a Wagmi connector
- the Turnkey connector can auto-connect after auth
- Turnkey session expiry can disconnect every active Wagmi connector
- external wallets can take over as the active Wagmi connector without bypassing Turnkey session authority
- direct message signing, typed-data signing, and transaction submission can run through `@turnkey/viem`

The package exports:

- `createTurnkeyConnector`
- `TurnkeySessionProvider`
- `TurnkeyWagmiBridge`
- `useTurnkeySessionGate`
- `useTurnkeyChainSwitch`
- `useTurnkeyWalletActions`

## Compatibility

- supported `wagmi` range: `>=2.19.5 <4`
- supported `@wagmi/core` range: `>=2.21.2 <4`
- supported `viem` range: `2.x`
- supported `react` range: `>=18`
- Reown/AppKit support is app-level integration, not part of the package compatibility contract
- testing to date has only covered EVM flows

Expected peer dependencies in the consuming app:

```bash
pnpm add turnkey-wagmi-connector wagmi @wagmi/core viem react @tanstack/react-query @turnkey/react-wallet-kit
```

If the consuming app uses TypeScript, it should also have its own compiler and React type packages installed:

```bash
pnpm add -D typescript @types/react
```

## Integration Rules

These are the requirements that matter in practice:

1. Mount `TurnkeySessionProvider` above every component that uses this package.
2. Mount `TurnkeyWagmiBridge` inside the `WagmiProvider` tree, once per Wagmi config.
3. Use the same chain set consistently across:
   - `createTurnkeyConnector({ chains })`
   - Wagmi `chains`
   - Wagmi `transports`
   - Reown/AppKit `networks` if you use AppKit
4. Give every target chain a real RPC URL in both chain metadata and Wagmi transports.
5. Make sure the Turnkey account has an embedded EVM wallet.
6. Establish Turnkey auth before expecting the connector to authorize or connect.

If those assumptions are wrong, failures usually show up as:

- `ProviderNotFoundError`
- Turnkey never appears as a connected Wagmi wallet
- direct wallet actions throw because no embedded account or no RPC URL is available
- AppKit or swap widgets silently fall back to public default RPCs

## Quick Start

This is the smallest reliable integration shape:

```tsx
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base, mainnet } from "viem/chains";
import type { TurnkeyProviderConfig } from "@turnkey/react-wallet-kit";
import {
  TurnkeySessionProvider,
  TurnkeyWagmiBridge,
  createTurnkeyConnector,
} from "turnkey-wagmi-connector";

const chains = [mainnet, base] as const;

function withRpcOverride<TChain extends (typeof chains)[number]>(
  chain: TChain,
  rpcUrl: string,
) {
  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: {
        ...chain.rpcUrls.default,
        http: [rpcUrl || chain.rpcUrls.default.http[0] || ""],
      },
      public: chain.rpcUrls.public
        ? {
            ...chain.rpcUrls.public,
            http: [rpcUrl || chain.rpcUrls.public.http[0] || ""],
          }
        : undefined,
    },
  };
}

const appChains = [
  withRpcOverride(mainnet, process.env.NEXT_PUBLIC_MAINNET_RPC_URL || ""),
  withRpcOverride(base, process.env.NEXT_PUBLIC_BASE_RPC_URL || ""),
] as const;

const turnkeyConnector = createTurnkeyConnector({
  chains: appChains,
  walletLabel: "Turnkey Session",
});

const wagmiConfig = createConfig({
  chains: appChains,
  connectors: [turnkeyConnector],
  transports: {
    [mainnet.id]: http(appChains[0].rpcUrls.default.http[0]),
    [base.id]: http(appChains[1].rpcUrls.default.http[0]),
  },
  ssr: true,
});

const turnkeyConfig: TurnkeyProviderConfig = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL || "https://api.turnkey.com",
  organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID || "",
  authProxyConfigId:
    process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID || undefined,
  auth: {
    autoRefreshSession: false,
    methods: {
      emailOtpAuthEnabled: true,
      smsOtpAuthEnabled: false,
      passkeyAuthEnabled: false,
      walletAuthEnabled: false,
      googleOauthEnabled: false,
      appleOauthEnabled: false,
      xOauthEnabled: false,
      discordOauthEnabled: false,
      facebookOauthEnabled: false,
    },
    methodOrder: ["email"],
  },
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

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
}
```

Provider order matters:

1. `QueryClientProvider`
2. `TurnkeySessionProvider`
3. `WagmiProvider`
4. `TurnkeyWagmiBridge`

## Reown / AppKit Notes

If you use Reown/AppKit, keep Turnkey and AppKit on the same network definitions and the same RPC URLs.

The working pattern used in the demo app is:

- clone each AppKit network
- override `rpcUrls.default.http`
- override `rpcUrls.public.http`
- pass those same networks into AppKit
- pass explicit `http(...)` transports into Wagmi

That prevents RPC traffic from falling back to public default endpoints. In this workspace, the Reown/AppKit and Wagmi chain setup is centralized in `apps/web/src/lib/app-config.ts`, and RPC values are wired from `apps/web/.env.local`.

## Hook Behavior

Standard Wagmi hooks still behave like standard Wagmi hooks. What changes is the active connector and its lifecycle.

- if the active connector is the Turnkey connector, Wagmi writes and signatures go through the Turnkey-backed provider
- if the active connector is an external wallet, Wagmi writes and signatures go through that wallet instead
- if the Turnkey session expires or becomes unauthenticated, `TurnkeyWagmiBridge` disconnects all active Wagmi connectors

Use the hooks like this:

- `useAccount()` tells you what Wagmi currently considers connected
- `useWriteContract()` routes through the active Wagmi connector
- `useDisconnect()` only disconnects Wagmi, not Turnkey auth
- `useTurnkeySessionGate()` gives you Turnkey-session-aware UI state and `disconnectAll()`
- `useTurnkeyWalletActions()` exposes direct Turnkey-backed signing and transaction helpers

## Common Pitfalls

- duplicate runtime copies of `wagmi` or `@turnkey/react-wallet-kit`
- mismatched chain sets between connector, Wagmi config, and AppKit config
- missing RPC overrides, which can make integrations silently fall back to public endpoints
- assuming swap-token balance is enough for execution on L2s when the wallet lacks enough native gas token
- LI.FI-style payloads may send `gasLimit` instead of `gas`; the connector normalizes that internally

## Documentation

- [Detailed package usage](./docs/PACKAGE_USAGE.md)
- [Workspace and demo apps](./docs/WORKSPACE.md)
- [Testing the demo](./docs/TESTING_DEMO.md)
- [Testing the Wagmi 3 demo](./docs/TESTING_DEMO_WAGMI3.md)
- [Publishing to npm](./docs/NPM_PUBLISHING.md)
- [Contributing](./CONTRIBUTING.md)

## Notes

- This project is currently maintained by a solo developer.
- A meaningful portion of the implementation and documentation was built with AI assistance.
- This package has only been tested for EVM flows so far.
- Further optimizations, refactors, or behavior changes may be possible, but they require review time to validate safely.

## License

MIT
