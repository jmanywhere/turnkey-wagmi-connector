# turnkey-wagmi-connector

Turnkey Embedded Wallet Kit integration for Wagmi v2.

This package makes a Turnkey embedded EVM wallet look like a normal Wagmi connector, keeps Wagmi connection state gated by the Turnkey session, and exposes a small set of direct Turnkey-backed wallet helpers for apps that need to bypass generic provider RPC flows.

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

## Runtime Model

The package is built around one rule:

1. Turnkey is the source of truth for authentication and session validity.
2. Wagmi connection state is allowed to exist only while the Turnkey session is valid.

That has a few important consequences:

- `TurnkeySessionProvider` mirrors Turnkey auth, session, wallet, and embedded-account data into an internal runtime store.
- `createTurnkeyConnector` reads that runtime store and only authorizes when Turnkey auth, session, HTTP client, and an embedded EVM account are all present.
- `TurnkeyWagmiBridge` auto-connects the Turnkey connector after auth, refreshes the Turnkey session on `beforeSessionExpiry`, and disconnects all Wagmi connectors if the Turnkey session expires, becomes unauthenticated, or refresh fails.
- If a user switches to an external wallet later, that wallet can become the active Wagmi connector, but it will still be dropped when the Turnkey session is no longer valid.

## Requirements

Peer dependencies expected by the consuming app:

```bash
pnpm add wagmi viem react @tanstack/react-query @turnkey/react-wallet-kit
```

The published package ships compiled JS and declaration files from `dist/`.

If you consume the workspace package directly inside this monorepo, keep `transpilePackages: ["turnkey-wagmi-connector"]` in Next.js so local development continues to work against the source package.

## Hard Requirements For A Working Integration

These are the requirements that matter in practice:

1. Your app must mount `TurnkeySessionProvider` above every component that uses this package.
2. Your app must mount `TurnkeyWagmiBridge` inside the `WagmiProvider` tree, once per Wagmi config.
3. The same chain set must be used consistently across:
   - `createTurnkeyConnector({ chains })`
   - Wagmi `chains`
   - Wagmi `transports`
   - Reown/AppKit `networks` if you use AppKit
4. Every chain you expect to use should have a real RPC URL configured in both chain metadata and Wagmi transports.
5. The Turnkey account must include an embedded EVM wallet. The package resolves the first embedded EVM account it finds and uses that as the signer.
6. Turnkey auth must be established before the connector can authorize or connect.

If any of those are wrong, the package will usually fail as one of:

- `ProviderNotFoundError`
- Turnkey connector never appears as connected
- direct wallet actions throw because no embedded account or no RPC URL is available
- AppKit or swap widgets silently talk to public default RPCs instead of your intended endpoint

## Configuration Checklist

Before debugging anything else, verify all of this:

- `organizationId` and `authProxyConfigId` are set in the Turnkey provider config
- `autoRefreshSession` is disabled in Turnkey auth config so the bridge owns refresh timing explicitly
- your app imports Turnkey Wallet Kit styles if required by your UI setup
- the connector is included in the Wagmi connector list
- `TurnkeyWagmiBridge` is mounted after `WagmiProvider`
- every chain has a non-empty RPC URL
- the same chain IDs are used everywhere
- the embedded account you expect to use is actually present in `turnkey.wallets`
- the wallet holds enough native gas token for the target chain

That last point matters for swap flows: on L2 routes, "insufficient funds" often means there is not enough native ETH for gas even when the swap token balance looks fine.

## Minimal Wagmi Integration

This is the smallest reliable integration shape.

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

function withRpcOverride<
  TChain extends (typeof chains)[number],
>(chain: TChain, rpcUrl: string) {
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
  apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL || "https://api.turnkey.com",
  organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID || "",
  authProxyConfigId: process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID || undefined,
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

### Why The Provider Order Matters

Use this order:

1. `QueryClientProvider`
2. `TurnkeySessionProvider`
3. `WagmiProvider`
4. `TurnkeyWagmiBridge`

`TurnkeySessionProvider` has to be above the bridge because the bridge reads Turnkey auth/session state. The bridge has to be inside `WagmiProvider` because it reads the active Wagmi config from context and calls Wagmi core actions against it.

## Reown / AppKit Integration

If you use Reown/AppKit, keep Turnkey and AppKit on the same network definitions and the same RPCs.

The demo app does this in `apps/web/src/lib/app-config.ts`:

- clone each AppKit network
- override `rpcUrls.default.http`
- override `rpcUrls.public.http`
- pass those same networks into AppKit
- pass explicit `http(...)` transports into Wagmi

That prevents RPC traffic from falling back to public defaults.

Example shape:

```tsx
import { AppKitProvider } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, mainnet, type AppKitNetwork } from "@reown/appkit/networks";
import { http } from "wagmi";
import { createTurnkeyConnector } from "turnkey-wagmi-connector";

const networks = [
  withRpcOverride(mainnet, process.env.NEXT_PUBLIC_MAINNET_RPC_URL || ""),
  withRpcOverride(base, process.env.NEXT_PUBLIC_BASE_RPC_URL || ""),
] as unknown as [AppKitNetwork, ...AppKitNetwork[]];

const turnkeyConnector = createTurnkeyConnector({
  chains: networks,
  walletLabel: "Turnkey Session",
});

const wagmiAdapter = new WagmiAdapter({
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "",
  networks,
  connectors: [turnkeyConnector],
  transports: {
    [mainnet.id]: http(networks[0].rpcUrls.default.http[0]),
    [base.id]: http(networks[1].rpcUrls.default.http[0]),
  },
  ssr: true,
});

const wagmiConfig = wagmiAdapter.wagmiConfig;
```

If AppKit is allowed to connect external wallets, that does not replace Turnkey as the session authority. `TurnkeyWagmiBridge` will still disconnect every active Wagmi connector if the Turnkey session is lost.

## How Wagmi Hooks Work With Turnkey

The package does not monkey-patch Wagmi hooks.

Instead, it changes two things:

1. it registers a normal Wagmi connector whose provider is backed by Turnkey
2. it adds a bridge that decides when Wagmi connections are allowed to stay alive

That means standard Wagmi hooks still behave like standard Wagmi hooks:

- read hooks like `useAccount`, `useBalance`, and `useChainId` read the current Wagmi state
- write hooks like `useWriteContract`, `useSendTransaction`, and `useSignMessage` use the active Wagmi connector
- disconnect hooks like `useDisconnect` disconnect the active Wagmi connector through Wagmi

What changes is the active connector and its lifecycle:

- if the active connector is the Turnkey connector, Wagmi writes and signatures go through the Turnkey-backed provider
- if the active connector is an external wallet, Wagmi writes and signatures go through that wallet instead
- if the Turnkey session expires or becomes unauthenticated, `TurnkeyWagmiBridge` disconnects all active Wagmi connectors, so normal Wagmi hooks immediately reflect a disconnected state

In other words:

- Wagmi hooks still read and write through Wagmi
- Turnkey is the session authority underneath that Wagmi state

### `useAccount`

`useAccount()` tells you what Wagmi currently thinks is connected. It does not tell you whether Turnkey auth exists by itself.

Example:

1. The user authenticates with Turnkey.
2. `TurnkeyWagmiBridge` auto-connects the Turnkey connector.
3. `useAccount()` returns the embedded Turnkey address and `isConnected: true`.

If the user later connects an external wallet through AppKit:

1. the external wallet can become the active Wagmi connector
2. `useAccount()` now returns the external wallet address
3. the Turnkey session still matters in the background

If the Turnkey session then expires:

1. `TurnkeyWagmiBridge` disconnects all Wagmi connectors
2. `useAccount()` flips to `isConnected: false`
3. the previously active external wallet is also dropped from Wagmi state

If you need Turnkey-specific state, pair `useAccount()` with `useTurnkeySessionGate()`:

```tsx
const account = useAccount();
const sessionGate = useTurnkeySessionGate();

const turnkeyBackedAddress =
  sessionGate.isSessionValid && account.isConnected
    ? account.address
    : undefined;
```

### `useWriteContract`

`useWriteContract()` behaves like normal Wagmi contract writing, but the actual signing path depends on the active connector.

When the active connector is Turnkey:

1. `writeContract()` builds a transaction through Wagmi and Viem
2. Wagmi sends that request through the Turnkey connector's provider
3. the connector intercepts the transaction request
4. it normalizes fields like `chainId`, `gas`, `gasLimit`, and fee params
5. it prepares the transaction and sends it through the Turnkey-backed provider
6. Turnkey signs as the embedded EVM account

Concrete example:

```tsx
import { useWriteContract } from "wagmi";
import { parseAbi } from "viem";

const { writeContractAsync } = useWriteContract();

await writeContractAsync({
  address: "0xYourToken" as `0x${string}`,
  abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]),
  functionName: "approve",
  args: ["0xSpender" as `0x${string}`, 123n],
});
```

With the Turnkey connector active, this ends up on the connector's `eth_sendTransaction` path. The connector will:

- ensure the request is on the right chain
- normalize transaction shape
- reconcile fee model issues
- map `gasLimit` to `gas` if an upstream tool used that field
- submit with the embedded Turnkey signer

If the active connector is an external wallet instead, `useWriteContract()` writes through that external wallet, not through Turnkey.

If there is no active Wagmi connector, or the Turnkey session has expired and the bridge has disconnected everything, `useWriteContract()` will fail the same way a normal disconnected Wagmi app would fail.

### `useDisconnect`

`useDisconnect()` only disconnects Wagmi connectors. It does not, by itself, terminate the Turnkey session.

Example:

```tsx
import { useDisconnect } from "wagmi";

const { disconnect } = useDisconnect();

await disconnect();
```

What that does:

- removes the active Wagmi connector from Wagmi state
- makes `useAccount()` report disconnected

What that does not do:

- it does not call Turnkey logout
- it does not invalidate the Turnkey session
- it does not remove the embedded account from the package runtime store

That means if the Turnkey session is still valid and `TurnkeyWagmiBridge` is mounted with `autoConnectTurnkey = true`, the bridge may reconnect the Turnkey connector again because the session is still healthy and no other connector is active.

If you want to close the Turnkey session as well, use `useTurnkeySessionGate().disconnectAll()` instead:

```tsx
const sessionGate = useTurnkeySessionGate();

await sessionGate.disconnectAll();
```

That path:

- logs out of Turnkey
- marks reconnect as required
- causes the bridge to clear Wagmi connections

### Practical Hook Rules

Use these rules when wiring UI:

- use `useAccount()` to know what Wagmi currently considers connected
- use `useTurnkeySessionGate()` to know whether that connection should be trusted as Turnkey-session-valid
- use `useWriteContract()` normally; it will route through Turnkey only when the Turnkey connector is the active Wagmi connector
- use `useDisconnect()` when you only want to drop the active Wagmi connection
- use `useTurnkeySessionGate().disconnectAll()` when you want to end the Turnkey session and force the whole integration back to an unauthenticated state

## Export Deep Dive

### `createTurnkeyConnector`

```ts
type CreateTurnkeyConnectorOptions = {
  chains: readonly [Chain, ...Chain[]];
  walletLabel?: string;
  icon?: string;
};
```

What it does:

- resolves the signer from the first embedded EVM account in Turnkey wallets
- lazily creates a Turnkey EIP-1193 provider
- exposes a Wagmi connector with `id: "turnkey"` and `type: "turnkey"`
- authorizes only when Turnkey auth, session, HTTP client, and embedded account exist
- switches provider chains with `wallet_switchEthereumChain`
- can add dynamic chains during `switchChain()` if `addEthereumChainParameter.rpcUrls` is present

Important details:

- the connector keeps an internal provider cache
- `connect()` calls `eth_requestAccounts` and emits a Wagmi `connect` event
- `disconnect()` clears the cached provider but does not itself log the user out of Turnkey
- `getChainId()` returns the connector's current in-memory chain, not a fresh network probe

### `TurnkeySessionProvider`

```ts
type TurnkeySessionProviderProps = {
  children: React.ReactNode;
  turnkeyConfig: TurnkeyProviderConfig;
  callbacks?: TurnkeyCallbacks;
};
```

What it does:

- wraps `TurnkeyProvider` from `@turnkey/react-wallet-kit`
- copies auth state, session, session expiry, HTTP client, and wallets into the package runtime store
- resolves and stores the first embedded EVM account
- merges your Turnkey callbacks with package callbacks

Events handled by the package:

- `beforeSessionExpiry`
- `onSessionExpired`
- `onAuthenticationSuccess`

Your callbacks still run. The package does not replace them; it composes them.

### `TurnkeyWagmiBridge`

```ts
type TurnkeyWagmiBridgeProps = {
  turnkeyConnectorId?: string;
  refreshLeadTimeMs?: number;
  autoConnectTurnkey?: boolean;
};
```

What it does today:

- auto-connects the Turnkey connector after auth when no Wagmi connector is already connected
- tracks the active Wagmi connector ID
- calls `refreshSession()` when Turnkey fires `beforeSessionExpiry`
- disconnects every active Wagmi connector if refresh fails
- disconnects every active Wagmi connector when Turnkey auth becomes unauthenticated
- disconnects every active Wagmi connector when the session is expired

Behavior to be aware of:

- `autoConnectTurnkey` defaults to `true`
- it mounts once per Wagmi config
- it reads the active Wagmi config from `WagmiProvider` via `useConfig()`
- it uses `wagmiConfig.chains[0]` as the initial auto-connect chain
- `refreshLeadTimeMs` is present in the prop type but is not currently read by the implementation

### `useTurnkeySessionGate`

This is the session-aware UI hook.

It returns:

- `authState`
- `reconnectRequired`
- `lastError`
- `activeConnectorId`
- `isSessionValid`
- `sessionExpiresAt`
- `sessionSecondsRemaining`
- `connectTurnkey()`
- `refreshSession()`
- `disconnectAll()`
- `lastEvent`
- `lastEventAt`
- `embeddedAccount`

Use it for:

- connect or reconnect buttons
- session-expired banners
- showing the active embedded address
- checking whether Wagmi connections should be treated as trustworthy

`disconnectAll()` logs out of Turnkey and marks reconnect as required.

### `useTurnkeyChainSwitch`

This hook exists because a plain Wagmi chain switch is not enough in every Turnkey state.

It:

- switches the active Wagmi connection when one exists
- falls back to direct provider `wallet_switchEthereumChain` when the active connector is Turnkey and Wagmi switching throws
- connects the Turnkey connector first if there is no active Wagmi connection but the Turnkey session is already valid

Use this hook when your UI needs to switch chains in a Turnkey-aware way.

### `useTurnkeyWalletActions`

This hook builds a direct Turnkey-backed Viem wallet client from:

- the Turnkey HTTP client
- the current Turnkey session organization ID
- the resolved embedded account
- the active Wagmi chain and its RPC URL

It returns:

- `address`
- `chainId`
- `signMessage()`
- `signTypedData()`
- `sendTransaction()`

Use this when you want direct Turnkey-backed actions without going through generic wallet-provider RPC methods.

If the active chain does not have a configured RPC URL, the hook throws.

## Transaction Behavior

The connector does more than forward `provider.request(...)`.

When it sees transaction and signing RPC methods, it normalizes the payload first.

### Signing

Special handling exists for:

- `personal_sign`
- `eth_signTypedData_v4`

The connector converts those calls into direct `@turnkey/viem` account operations backed by the current Turnkey session.

### Transactions

Special handling exists for:

- `eth_sendTransaction`
- `eth_signTransaction`

Before sending, the connector:

- normalizes decimal, bigint, and hex quantity fields into hex
- maps `gasLimit` to `gas`
- derives `chainId` from `transaction.chain.id` if necessary
- normalizes symbolic transaction types like `eip1559` into hex types
- reconciles legacy and EIP-1559 fee fields
- prepares the transaction with Viem
- tries to estimate gas even when an upstream app already sent a padded `gas`
- caps badly inflated upstream gas to 130% of the RPC estimate when the upstream value is more than 2x the estimate
- preserves moderately higher upstream gas if it still looks reasonable
- waits for a receipt before allowing another send on the same `from + chainId` queue, reducing nonce-collision risk

This behavior is especially relevant for widget and route payloads from tools like LI.FI, where the upstream request may include:

- decimal chain IDs
- `gasLimit` instead of `gas`
- legacy fee fields on one chain and EIP-1559 fee fields on another
- padded gas values from route quotes

## Recommended Config

These defaults match the package behavior well:

- set `auth.autoRefreshSession` to `false`
- let `TurnkeyWagmiBridge` handle refresh and expiry reactions
- configure only the auth methods you actually want exposed
- pass env-backed RPC URLs into both chain metadata and Wagmi transports
- use one embedded EVM account until you build a proper account selector

## Troubleshooting

### The Turnkey connector never connects

Check all of these:

- the user is authenticated in Turnkey
- `TurnkeySessionProvider` is mounted
- `TurnkeyWagmiBridge` is mounted inside `WagmiProvider`
- an embedded EVM account exists in `turnkey.wallets`
- the connector is present in the Wagmi connector list

### `ProviderNotFoundError`

This usually means the runtime store is missing one of:

- Turnkey HTTP client
- session organization ID
- embedded EVM account

That points back to auth state, provider order, or account resolution.

### Chain switching fails

Use `useTurnkeyChainSwitch()` instead of assuming `wagmiSwitchChain()` alone is enough.

If you switch to a chain that was not preconfigured, `switchChain()` only has enough information to add it when `addEthereumChainParameter.rpcUrls` is provided.

### RPC traffic is hitting public endpoints

You did not wire the RPC URL in both places:

- chain metadata `rpcUrls`
- Wagmi `transports`

If you use Reown/AppKit, update the AppKit network objects too.

### Direct wallet actions throw `No RPC URL configured for the active chain.`

The active chain definition is missing:

- `chain.rpcUrls.default.http[0]`
- and `chain.rpcUrls.public.http[0]`

Set a real RPC URL on the chain object, not only on Wagmi transports.

### Swap or route execution fails with insufficient funds

On L2 flows this often means the wallet does not hold enough native gas token, even if the swap token balance is sufficient.

Examples:

- Base needs ETH for gas
- Arbitrum needs ETH for gas
- Optimism needs ETH for gas
- Polygon needs MATIC for gas

### Duplicate provider/runtime issues in a monorepo

If you see hook/provider mismatch errors, make sure the app and workspace package resolve the same runtime copy of:

- `react`
- `wagmi`
- `@turnkey/react-wallet-kit`

## Current Limitations

- first embedded EVM account only
- no embedded account picker yet
- EVM-focused flow only
- source-exported package, not a publish-ready compiled dist

## Reference Integration In This Repo

The demo app in this workspace is the current reference:

- `apps/web/src/lib/app-config.ts`
- `apps/web/src/components/providers.tsx`
- `apps/web/src/components/widget-demo.tsx`
- `apps/web/src/components/sandbox-demo.tsx`

If you need a known-good setup, start there and keep the same provider order and RPC wiring.
