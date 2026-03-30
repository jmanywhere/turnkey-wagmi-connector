# turnkey-wagmi-connector

Turnkey Embedded Wallet Kit integration for Wagmi v2, with a Next.js demo that proves:

- Turnkey embedded EVM wallets can appear as a connected Wagmi wallet
- `@lifi/widget` can reuse that Wagmi connection
- Reown AppKit can switch from the Turnkey connector to an external wallet
- Turnkey session refresh is attempted explicitly
- all active Wagmi connectors are disconnected if the Turnkey session is lost

## Workspace

```text
apps/web
packages/turnkey-wagmi-connector
```

`packages/turnkey-wagmi-connector` contains:

- `TurnkeySessionProvider`
- `TurnkeyWagmiBridge`
- `createTurnkeyConnector`
- `useTurnkeySessionGate`
- `useTurnkeyWalletActions`

`apps/web` contains:

- `/widget` for LI.FI + Reown + Turnkey session orchestration
- `/sandbox` for direct Turnkey signing and transaction helpers on Base Sepolia

## Stack

- `next@16.2.1`
- `react@19.2.4`
- `wagmi@2.19.5`
- `viem@2.47.6`
- `@turnkey/react-wallet-kit@1.11.0`
- `@turnkey/eip-1193-provider@3.4.27`
- `@turnkey/viem@0.14.27`
- `@lifi/widget@3.40.12`
- `@reown/appkit@1.8.19`
- `@reown/appkit-adapter-wagmi@1.8.19`

## Environment

Copy `apps/web/.env.example` and provide:

```bash
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=
NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID=
NEXT_PUBLIC_TURNKEY_API_BASE_URL=https://api.turnkey.com

NEXT_PUBLIC_REOWN_PROJECT_ID=

NEXT_PUBLIC_MAINNET_RPC_URL=
NEXT_PUBLIC_BASE_RPC_URL=
NEXT_PUBLIC_ARBITRUM_RPC_URL=
NEXT_PUBLIC_OPTIMISM_RPC_URL=
NEXT_PUBLIC_POLYGON_RPC_URL=
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=
```

The demo is wired for:

- Turnkey email OTP auth only
- explicit `refreshSession()` handling
- auto refresh disabled in EWK config
- first embedded EVM account only

## Development

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm typecheck
pnpm build
```

## Notes

- `/widget` and `/sandbox` are dynamic routes because they depend on client-side wallet providers.
- The package exposes direct Turnkey helpers, but the sandbox route currently uses an app-local direct-action hook to avoid a Next workspace provider-identity issue during SSR.
- LI.FI currently pulls multichain wallet dependencies, including Sui packages, so the app pins `@mysten/sui@2.8.0` to keep the widget build stable.

## License

MIT
