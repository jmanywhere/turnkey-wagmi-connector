# Testing The Demo

This document explains how to verify the demo app in `apps/web`.

## What You Need

Before testing, make sure you have:

- a Turnkey parent organization
- a Turnkey auth proxy config that supports email OTP
- a Reown project ID
- RPC URLs for the configured chains, or let the app fall back to the default viem chain RPCs
- Base Sepolia test funds if you want to test transaction sending

## Environment Setup

Create `apps/web/.env.local` from `apps/web/.env.example`.

Required values:

```bash
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=
NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID=
NEXT_PUBLIC_REOWN_PROJECT_ID=
```

Optional but recommended:

```bash
NEXT_PUBLIC_TURNKEY_API_BASE_URL=https://api.turnkey.com
NEXT_PUBLIC_MAINNET_RPC_URL=
NEXT_PUBLIC_BASE_RPC_URL=
NEXT_PUBLIC_ARBITRUM_RPC_URL=
NEXT_PUBLIC_OPTIMISM_RPC_URL=
NEXT_PUBLIC_POLYGON_RPC_URL=
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=
```

## Start The App

From the repo root:

```bash
pnpm install
pnpm dev
```

Open:

- `http://localhost:3000/widget`
- `http://localhost:3000/sandbox`

## Acceptance Checklist: `/widget`

This route proves the LI.FI + Wagmi + Reown integration behavior.

### 1. Turnkey session login

1. Open `/widget`.
2. Click `Connect Turnkey session`.
3. Complete email OTP login in the Turnkey modal.

Expected result:

- Turnkey auth state becomes `authenticated`
- the embedded EVM wallet auto-connects through the custom Wagmi connector
- the page shows an embedded wallet address
- the active Wagmi connector should become `Turnkey Session`

### 2. LI.FI sees the wallet as connected

After Turnkey auth succeeds:

- the LI.FI widget should render inside the same provider tree
- the widget should not require a second independent wallet connection
- the current Wagmi-selected wallet should be treated as the connected wallet

### 3. Wagmi action works with the selected wallet

Click `Sign via Wagmi`.

Expected result:

- if `Turnkey Session` is the active connector, the message is signed by the embedded wallet
- a signature appears in the UI

### 4. Switch to an external wallet

Use the Reown AppKit buttons:

1. Click `AppKitConnectButton`
2. Choose an external wallet
3. Connect it

Expected result:

- the active Wagmi connector changes from `Turnkey Session` to the external wallet
- Turnkey auth remains active in the background
- LI.FI should now follow the external wallet as the selected connected Wagmi wallet

### 5. Refresh the Turnkey session

Click `Refresh session`.

Expected result:

- `refreshSession()` runs through Turnkey EWK
- the active Wagmi connector remains connected
- if the external wallet is active, it should stay active

### 6. Force a disconnect condition

To test the disconnect path:

1. log out from Turnkey using `Disconnect all`, or
2. let the Turnkey session expire naturally, or
3. temporarily invalidate the auth/session and reload

Expected result:

- Turnkey becomes unauthenticated
- the bridge disconnects active Wagmi connectors
- LI.FI should no longer treat the wallet as connected

## Acceptance Checklist: `/sandbox`

This route verifies direct Turnkey-backed viem actions.

### 1. Sign a message directly

1. Make sure you are authenticated with Turnkey.
2. Open `/sandbox`.
3. Click `Sign message`.

Expected result:

- a signature is returned using Turnkey-backed signing
- the output appears in the response box

### 2. Sign typed data directly

Click `Sign typed data`.

Expected result:

- typed data is signed through Turnkey
- the signature appears in the UI

### 3. Send a Base Sepolia transaction

1. Enter a valid Base Sepolia recipient address
2. Enter a small ETH amount like `0.00001`
3. Click `Send direct transaction`

Expected result:

- a transaction hash is returned
- the hash can be checked on a Base Sepolia explorer

## Useful Verification Commands

Run from the repo root:

```bash
pnpm typecheck
pnpm build
```

Expected result:

- typecheck passes for both workspace packages
- production build succeeds

## Current Caveats

- `/widget` and `/sandbox` are marked dynamic because they depend on client-side wallet providers.
- LI.FI currently pulls multichain dependencies, so the app pins `@mysten/sui@2.8.0` to keep the widget build stable.
