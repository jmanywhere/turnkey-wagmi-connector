# Package Usage

This document explains how to use `turnkey-wagmi-connector` in your own app.

## What The Package Does

The package provides a Turnkey-backed Wagmi connector and a session bridge.

The intended model is:

1. Turnkey Embedded Wallet Kit owns authentication and session state.
2. The package exposes a Wagmi connector that makes the embedded Turnkey EVM wallet look like a normal Wagmi wallet.
3. The bridge auto-connects the Turnkey wallet after auth.
4. The bridge proactively calls `refreshSession()` before expiry.
5. If Turnkey auth disappears, all active Wagmi connectors are disconnected.

This lets you:

- expose the embedded Turnkey wallet inside a normal Wagmi app
- reuse that connection in LI.FI or other Wagmi-aware tools
- allow the user to switch to external wallets without dropping the Turnkey session authority

## Exports

**Runtime:** the package is **React-only**. It ships providers and hooks for client React trees. Do not expect it to run in Node scripts, service workers, or non-React bundles without a React host.

Current public exports and typical usage:

- **`createTurnkeyConnector`** — Factory for a Wagmi `Connector` backed by Turnkey’s embedded EVM account; pass the result in your Wagmi `connectors` list (see fixtures’ `app-config` / provider setup).
- **`TurnkeySessionProvider`** — Wraps `@turnkey/react-wallet-kit` and mirrors Turnkey auth/session into the connector runtime; must wrap any usage of the bridge or connector.
- **`TurnkeyWagmiBridge`** — Mount once inside `WagmiProvider`: auto-connects the Turnkey connector after auth, refreshes session before expiry, and disconnects Wagmi when Turnkey session ends.
- **`useTurnkeySessionGate`** — Hook for session-aware UI: auth state, reconnect hints, `connectTurnkey` / `refreshSession` / `disconnectAll`, embedded account metadata.
- **`useTurnkeyChainSwitch`** — Hook for chain changes that stay aligned with Turnkey + Wagmi (when the app manages network switching outside AppKit).
- **`useTurnkeyWalletActions`** — Direct `@turnkey/viem` helpers (`signMessage`, `signTypedData`, `sendTransaction`) bypassing generic provider wiring when you need them.

Environment variables such as `NEXT_PUBLIC_TURNKEY_*` or `NEXT_PUBLIC_REOWN_*` appear in **demo apps** (`apps/web`, `apps/web-npm`, `apps/web-wagmi3`) only as a way to feed Wagmi, Reown, and Turnkey config. **The npm package does not read `process.env`.** You supply `TurnkeyProviderConfig`, Wagmi config, and AppKit options from whatever source your app uses. For the npm fixture’s env mapping, see `apps/web-npm/README.md`.

## Compatibility

- `apps/web`: Wagmi 2 + Reown/AppKit acceptance fixture
- `apps/web-npm`: Wagmi 2 + Reown/AppKit fixture that consumes the published npm package
- `apps/web-wagmi3`: pure Wagmi 3 acceptance fixture
- supported `wagmi` range: `>=2.19.5 <4`
- supported `@wagmi/core` range: `>=2.21.2 <4`
- supported `viem` range: `2.x`
- supported `react` range: `>=18`
- apps must install matching `wagmi` and `@wagmi/core` versions

## Install

The package currently expects these peers in the consuming app:

```bash
pnpm add wagmi @wagmi/core viem react @tanstack/react-query @turnkey/react-wallet-kit
```

If your app uses TypeScript, also install the compiler and React types in the app itself:

```bash
pnpm add -D typescript @types/react
```

The reusable package itself depends on:

- `@turnkey/core`
- `@turnkey/eip-1193-provider`
- `@turnkey/sdk-types`
- `@turnkey/viem`
- `@wagmi/core` as an app-installed peer

## Typical Integration Shape

You usually want:

1. a Turnkey provider config
2. a custom Turnkey connector from `createTurnkeyConnector`
3. a normal Wagmi config that includes that connector
4. `TurnkeySessionProvider` wrapped around your app
5. `TurnkeyWagmiBridge` inside the provider tree

## Required Data

These are the data categories the package needs in order to work reliably in both
Wagmi 2 and Wagmi 3 apps:

- compatibility data
  - target `wagmi` version
  - target `@wagmi/core` version
  - target `viem` version
  - target `react` version
- Turnkey session data
  - `authState`
  - `session`
  - `session.organizationId`
  - `session.expiry`
  - `httpClient`
  - `wallets`
- resolved embedded account data
  - `address`
  - `walletId`
  - `walletAccountId`
  - wallet and account metadata
- configured chain data
  - `id`
  - `name`
  - `nativeCurrency`
  - `rpcUrls`
  - block explorer URLs when available
  - optional `wallet_addEthereumChain` payload data
- transaction request data
  - `chainId`
  - `from`
  - `to`
  - `data`
  - `value`
  - `gas` or `gasLimit`
  - `gasPrice`
  - `maxFeePerGas`
  - `maxPriorityFeePerGas`
  - `maxFeePerBlobGas`
  - `nonce`
  - `type`
  - `accessList`
  - `authorizationList`
  - blob-related fields
- demo env data
  - `NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID`
  - `NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID`
  - `NEXT_PUBLIC_TURNKEY_API_BASE_URL`
  - per-chain RPC URLs for every configured chain
- Reown-only demo data
  - `NEXT_PUBLIC_REOWN_PROJECT_ID` for `apps/web` and `apps/web-npm` when using Reown/AppKit (and for `apps/web-wagmi3` `/widget`)

## Example

```tsx
"use client";

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
} as const;

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
}
```

## `createTurnkeyConnector`

Use this when you want the embedded Turnkey wallet to behave like a normal Wagmi connector.

Input:

```ts
type CreateTurnkeyConnectorOptions = {
  chains: readonly [Chain, ...Chain[]];
  walletLabel?: string;
  icon?: string;
};
```

Behavior:

- resolves the first embedded EVM account from Turnkey wallets
- creates a Turnkey EIP-1193 provider lazily
- supports connect, disconnect, account lookup, auth checks, and chain switching
- returns unauthorized unless Turnkey auth and an embedded EVM account both exist

## `TurnkeySessionProvider`

Wraps `@turnkey/react-wallet-kit` and syncs Turnkey state into the package runtime.

Props:

```ts
type TurnkeySessionProviderProps = {
  children: React.ReactNode;
  turnkeyConfig: TurnkeyProviderConfig;
  callbacks?: TurnkeyCallbacks;
};
```

Important behavior:

- mirrors Turnkey auth/session/wallet data into a runtime store
- resolves the embedded EVM account
- records `beforeSessionExpiry`, `onSessionExpired`, and `onAuthenticationSuccess`

## `TurnkeyWagmiBridge`

Use this once per Wagmi config.

Props:

```ts
type TurnkeyWagmiBridgeProps = {
  turnkeyConnectorId?: string;
  refreshLeadTimeMs?: number;
  autoConnectTurnkey?: boolean;
};
```

Current behavior:

- auto-connects the Turnkey connector after successful auth if no other connector is active
- calls `refreshSession()` when Turnkey reports `beforeSessionExpiry`
- disconnects all active Wagmi connectors if refresh fails
- disconnects all active connectors again when the Turnkey session actually expires
- disconnects all connectors when Turnkey auth becomes unauthenticated

## `useTurnkeySessionGate`

Useful if you want session-aware UI controls.

Returns:

- `authState`
- `reconnectRequired`
- `activeConnectorId`
- `isSessionValid`
- `connectTurnkey()`
- `refreshSession()`
- `disconnectAll()`
- `lastEvent`
- `lastEventAt`
- `embeddedAccount`

Typical uses:

- connect/reconnect button
- session-expired banner
- embedded-account display
- debug panels

## `useTurnkeyWalletActions`

This exposes direct Turnkey-backed wallet actions using `@turnkey/viem`.

Returns:

- `address`
- `chainId`
- `signMessage()`
- `signTypedData()`
- `sendTransaction()`

Use this when you want to bypass generic provider semantics and sign/send directly through Turnkey.

## Recommended App Configuration

For the auth config:

- set `autoRefreshSession: false`
- let the bridge call `refreshSession()` explicitly
- enable only the auth methods you actually want

For first implementation:

- keep the package EVM-only
- use one embedded EVM account
- resolve the first embedded EVM account as the active signer

## Common Pitfalls

### 1. Duplicate provider packages

Your app and the package must share the same React provider instances.

If you see errors like:

- `useConfig must be used within WagmiProvider`
- `useTurnkey must be used within TurnkeyProvider`

you likely have duplicate runtime copies of:

- `wagmi`
- `@turnkey/react-wallet-kit`

### 2. Turnkey auth is the source of truth

Do not treat Wagmi persistence alone as the source of connection state.

The bridge is designed so that:

- valid Turnkey session => Wagmi connectors may stay connected
- invalid Turnkey session => active Wagmi connectors are disconnected

### 3. External wallet switching does not replace Turnkey session authority

An external wallet can become the active Wagmi connector, but Turnkey still governs whether the session is valid.

### 4. SSR and monorepos

If you use the package inside a Next monorepo workspace, pay attention to:

- shared peer dependencies
- dynamic routes where client-only wallet providers are required
- `transpilePackages` if you consume the workspace package source directly
- no `transpilePackages` requirement if you consume the published npm build

## Current Limitations

- React-only; no first-class support for non-React consumers
- first embedded EVM account only
- no account selector
- no Solana support
- published npm build currently validated in `apps/web-npm`
