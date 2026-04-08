# Testing The Wagmi 3 Demo

This document explains how to verify the Wagmi 3 fixture in `apps/web-wagmi3`.

## What You Need

Before testing, make sure you have:

- a Turnkey parent organization
- a Turnkey auth proxy config that supports email OTP
- a Reown project ID if you want to test the `/widget` comparison route
- RPC URLs for the configured chains
- Base Sepolia test funds if you want to test transaction sending

## Environment Setup

Create `apps/web-wagmi3/.env.local` from `apps/web-wagmi3/.env.example`.

Required values:

```bash
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=
NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID=
```

Required for `/widget`:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=
```

Optional but recommended:

```bash
NEXT_PUBLIC_TURNKEY_API_BASE_URL=https://api.turnkey.com
NEXT_PUBLIC_MAINNET_RPC_URL=
NEXT_PUBLIC_BASE_RPC_URL=
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=
```

## Start The App

From the repo root:

```bash
pnpm install
pnpm dev:wagmi3
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/widget`

## Acceptance Checklist: `/`

### 1. Turnkey session login

1. Open `/`.
2. Click `Connect Turnkey session`.
3. Complete email OTP login in the Turnkey modal.

Expected result:

- Turnkey auth state becomes `authenticated`
- the embedded EVM wallet auto-connects through the custom Wagmi connector
- the active connector becomes `Turnkey Session`
- the selected address and balance populate in the UI

### 2. Wagmi path works

After Turnkey auth succeeds:

1. Click `Sign via Wagmi`.

Expected result:

- the message is signed through the active Wagmi connector
- a signature appears in the Wagmi section

### 3. Chain switching works

1. Click the chain-switch buttons for `Base`, `Base Sepolia`, and `Mainnet`.

Expected result:

- the current chain id updates
- the active Wagmi connector remains connected when the session is valid

### 4. Direct Turnkey actions work

1. Click `Direct sign message`.
2. Click `Direct sign typed data`.

Expected result:

- both signatures are returned through `@turnkey/viem`
- each signature appears in the UI

### 5. Direct transaction path works

1. Switch to `Base Sepolia`.
2. Enter a valid recipient address or leave the field empty to default to the active address.
3. Enter a small ETH value like `0.00001`.
4. Click `Send direct transaction`.

Expected result:

- a transaction hash is returned
- the hash can be checked on a Base Sepolia explorer

### 6. Disconnect path works

1. Click `Disconnect all`.

Expected result:

- Turnkey logs out
- the Wagmi account becomes disconnected
- the connector is no longer shown as active

## Acceptance Checklist: `/widget`

This route proves the Wagmi 3 + LI.FI + Reown integration behavior.

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

## Useful Verification Commands

Run from the repo root:

```bash
pnpm --filter turnkey-wagmi-connector test
pnpm --filter web-wagmi3 typecheck
pnpm --filter web-wagmi3 build
```

Expected result:

- package tests pass
- the Wagmi 3 app typechecks
- the Wagmi 3 app production build succeeds
