# turnkey-wagmi-connector

Turnkey Embedded Wallet Kit integration for Wagmi v2 and v3, with separate Next.js fixtures for:

- Turnkey embedded EVM wallets can appear as a connected Wagmi wallet
- `@lifi/widget` can reuse that Wagmi connection
- Reown AppKit can switch from the Turnkey connector to an external wallet
- Turnkey session refresh is attempted explicitly
- all active Wagmi connectors are disconnected if the Turnkey session is lost

## Workspace

```text
apps/web
apps/web-wagmi3
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

`apps/web-wagmi3` contains:

- `/` for a pure Wagmi 3 + Turnkey validation flow without Reown/AppKit
- `/widget` for the Wagmi 3 + Reown/AppKit + LI.FI comparison flow

## Compatibility Matrix

- `packages/turnkey-wagmi-connector` supports `wagmi >=2.19.5 <4` and `@wagmi/core >=2.21.2 <4`
- `apps/web` is the Wagmi 2 + Reown/AppKit acceptance fixture
- `apps/web-wagmi3` is the Wagmi 3 acceptance fixture with both pure and Reown/LI.FI routes

## Stack

- `next@16.2.1`
- `react@19.2.4`
- `wagmi@2.19.5` in `apps/web`
- `wagmi@3.6.0` in `apps/web-wagmi3`
- `@wagmi/core@3.4.1` in `apps/web-wagmi3`
- `viem@2.47.6`
- `@turnkey/react-wallet-kit@1.11.0`
- `@turnkey/eip-1193-provider@3.4.27`
- `@turnkey/viem@0.14.27`
- `@lifi/widget@3.40.12`
- `@reown/appkit@1.8.19`
- `@reown/appkit-adapter-wagmi@1.8.19`

## Environment

Copy `apps/web/.env.example` or `apps/web-wagmi3/.env.example` and provide:

```bash
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=
NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID=
NEXT_PUBLIC_TURNKEY_API_BASE_URL=https://api.turnkey.com

NEXT_PUBLIC_MAINNET_RPC_URL=
NEXT_PUBLIC_BASE_RPC_URL=
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=
```

`apps/web` also needs:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=
NEXT_PUBLIC_ARBITRUM_RPC_URL=
NEXT_PUBLIC_OPTIMISM_RPC_URL=
NEXT_PUBLIC_POLYGON_RPC_URL=
```

`apps/web-wagmi3` also needs `NEXT_PUBLIC_REOWN_PROJECT_ID=` if you want to use `/widget`.

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

For the Wagmi 3 fixture:

```bash
pnpm dev:wagmi3
```

Useful commands:

```bash
pnpm typecheck
pnpm build
```

## Documentation

- [Package README](./packages/turnkey-wagmi-connector/README.md)
- [Testing the demo](./docs/TESTING_DEMO.md)
- [Testing the Wagmi 3 demo](./docs/TESTING_DEMO_WAGMI3.md)
- [Package usage](./docs/PACKAGE_USAGE.md)
- [Publishing to npm](./docs/NPM_PUBLISHING.md)

## Notes

- `/widget` and `/sandbox` are dynamic routes because they depend on client-side wallet providers.
- `apps/web-wagmi3` keeps `/` intentionally Reown-free so Wagmi 3 connector compatibility can still be validated without external-wallet orchestration variables.
- LI.FI currently pulls multichain wallet dependencies, including Sui packages, so the app pins `@mysten/sui@2.8.0` to keep the widget build stable.

## License

MIT
