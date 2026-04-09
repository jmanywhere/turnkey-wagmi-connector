## Learned User Preferences

- Wire RPC endpoints from `apps/web/.env.local` into Reown/AppKit network config and Wagmi transports so RPC traffic does not fall back to public default endpoints.
- Treat `apps/web-npm` as a readable integration guide for TypeScript/React: docs-style structure, modern UI, and dark mode so consumers can follow setup end-to-end.

## Learned Workspace Facts

- Monorepo: `apps/web` (demo) and `packages/turnkey-wagmi-connector` (Turnkey + Wagmi connector).
- Reown/AppKit and Wagmi chain setup is centralized in `apps/web/src/lib/app-config.ts`, including env-backed `rpcUrls` on cloned network definitions.
- LI.FI-style and API payloads may ship `gasLimit` instead of `gas`; the connector normalizes `gasLimit` → `gas` in `packages/turnkey-wagmi-connector/src/connector/create-turnkey-connector.ts`.
- Transaction request shaping, fee-model reconciliation, and related fixes for Arbitrum/LI.FI flows are owned in `create-turnkey-connector.ts`.
- On L2 swap routes, “insufficient funds” / gas errors often reflect too little native ETH for gas even when the widget balance for the swap token looks sufficient.
- `turnkey-wagmi-connector` does not read `process.env`; demo apps map `NEXT_PUBLIC_*` through their own `env` / `app-config` modules (see `apps/web-npm/README.md` and `src/lib` for the npm fixture).
- `apps/web-npm` installs `turnkey-wagmi-connector` from the npm registry to validate the published package build instead of the workspace package.
