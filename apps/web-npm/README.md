# web-npm — npm consumer fixture

Private **Next.js** demo app. It installs `turnkey-wagmi-connector` from **npm** to validate the published build instead of `packages/turnkey-wagmi-connector` in the workspace.

This directory is **not** a publishable library. Do not import it from other apps; copy integration patterns from `src/lib` and `src/components/providers.tsx` into your own project.

## React-only runtime

- **`turnkey-wagmi-connector` is a React package.** It expects a client React tree with `TurnkeySessionProvider`, `TurnkeyWagmiBridge`, and hooks. It is **not** intended for Node-only scripts, workers, or non-React UIs.
- This fixture uses the **App Router** with `"use client"` modules for Wagmi, Turnkey Embedded Wallet Kit, and Reown AppKit.

## Environment variables

Every `NEXT_PUBLIC_*` value here belongs to **this app’s Wagmi, Turnkey, and Reown wiring** — read in `src/lib/env.ts` and applied in `src/lib/app-config.ts`.

They are **not** part of the `turnkey-wagmi-connector` public API. The package does not read `process.env` or mandate specific variable names. In your app you may load organization IDs, RPC URLs, and Reown credentials from env, remote config, or constants, as long as you pass the resulting objects into `@turnkey/react-wallet-kit`, Wagmi, and AppKit.

| Variable | Role in this fixture |
| --- | --- |
| `NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID` | Turnkey org ID for Embedded Wallet Kit (`turnkeyProviderConfig.organizationId`). |
| `NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID` | Auth proxy config for Turnkey session (`turnkeyProviderConfig.authProxyConfigId`). |
| `NEXT_PUBLIC_TURNKEY_API_BASE_URL` | Turnkey HTTP API base (`turnkeyProviderConfig.apiBaseUrl`; defaults to `https://api.turnkey.com`). |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Reown Cloud `projectId` for `WagmiAdapter` and `AppKitProvider`. |
| `NEXT_PUBLIC_MAINNET_RPC_URL`, `NEXT_PUBLIC_BASE_RPC_URL`, `NEXT_PUBLIC_ARBITRUM_RPC_URL`, `NEXT_PUBLIC_OPTIMISM_RPC_URL`, `NEXT_PUBLIC_POLYGON_RPC_URL`, `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` | Overrides on cloned AppKit networks and matching `http()` transports so RPC traffic avoids anonymous public defaults when set. |

Use `.env.local` (see `.env.example` and repo `docs/WORKSPACE.md`).

## `src/lib` exports (demo-only)

These modules centralize configuration for `/`, `/widget`, and `/sandbox`. They are **not** published on npm.

### `env.ts`

- **`publicEnv`** — Consolidated `NEXT_PUBLIC_*` strings (empty string when unset unless a default applies).
- **`isTurnkeyConfigured`** — `true` when Turnkey org and auth proxy IDs are both non-empty; drives warnings in `SharedRuntime`.
- **`isReownConfigured`** — `true` when Reown project ID is non-empty; drives warnings in `SharedRuntime`.

### `app-config.ts` (client)

- **`appChains`** — Ordered chain list shared by `createTurnkeyConnector` and AppKit network cloning.
- **`turnkeyConnector`** — `createTurnkeyConnector({ chains: appChains, ... })` for this demo.
- **`wagmiAdapter`** — Reown `WagmiAdapter` with `turnkeyConnector`, networks, and transports.
- **`wagmiConfig`** — `wagmiAdapter.wagmiConfig` passed to `WagmiProvider` in `providers.tsx`.
- **`appKitConfig`** — Spread into `AppKitProvider` (networks, metadata, defaults).
- **`turnkeyProviderConfig`** — `TurnkeyProviderConfig` for `TurnkeySessionProvider` (merged with theme-driven `ui.darkMode` in `providers.tsx`).
- **`AppKitProvider`** — Re-exported next to `appKitConfig` for a single import site in `providers.tsx`.

**Call graph:** `app/layout.tsx` → `Providers` → `TurnkeySessionProvider` / `WagmiProvider` / `AppKitProvider` / `TurnkeyWagmiBridge`. Demo pages use `SharedRuntime`, LI.FI, or sandbox components under that tree.

## Commands

From repo root: `pnpm dev:npm` (runs `pnpm --filter web-npm dev`).
