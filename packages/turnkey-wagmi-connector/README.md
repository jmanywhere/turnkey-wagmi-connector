# turnkey-wagmi-connector

Turnkey Embedded Wallet Kit integration for Wagmi v2 and v3.

This package makes a Turnkey embedded EVM wallet behave like a normal Wagmi connector, keeps Wagmi connection state gated by the Turnkey session, and exposes direct Turnkey-backed wallet helpers when you need them.

## Version

The package version is defined in `package.json`.

Current repo version:

- `turnkey-wagmi-connector@0.0.1`

## Install

```bash
pnpm add turnkey-wagmi-connector wagmi @wagmi/core viem react @tanstack/react-query @turnkey/react-wallet-kit
```

## Exports

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
- testing to date has only covered EVM flows

## Minimal Integration

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
        process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL ||
        "https://api.turnkey.com",
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

Provider order:

1. `QueryClientProvider`
2. `TurnkeySessionProvider`
3. `WagmiProvider`
4. `TurnkeyWagmiBridge`

## AppKit / RPC Notes

If you use Reown/AppKit, keep the AppKit networks and Wagmi transports on the same RPC URLs. In this workspace, `apps/web/src/lib/app-config.ts` clones the network definitions and injects RPC URLs from `apps/web/.env.local` so requests do not fall back to public default endpoints.

## More Docs

- root package overview: `https://github.com/jmanywhere/turnkey-wagmi-connector#readme`
- detailed usage: `https://github.com/jmanywhere/turnkey-wagmi-connector/blob/main/docs/PACKAGE_USAGE.md`
- publishing: `https://github.com/jmanywhere/turnkey-wagmi-connector/blob/main/docs/NPM_PUBLISHING.md`
