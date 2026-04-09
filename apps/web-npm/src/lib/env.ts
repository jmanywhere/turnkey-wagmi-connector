/**
 * Next.js public env surface for this demo app only.
 *
 * Values feed the Wagmi + Reown + Turnkey stack in `app-config.ts`. The
 * `turnkey-wagmi-connector` package does not read these variables; your app
 * must pass equivalent config into providers and connectors explicitly.
 */
export const publicEnv = {
  turnkeyOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID ?? "",
  turnkeyAuthProxyConfigId: process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID ?? "",
  turnkeyApiBaseUrl:
    process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL ?? "https://api.turnkey.com",
  reownProjectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "",
  mainnetRpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "",
  baseRpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "",
  arbitrumRpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ?? "",
  optimismRpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL ?? "",
  polygonRpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL ?? "",
  baseSepoliaRpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "",
};

/** True when org + auth proxy IDs are set; used for onboarding banners in the UI. */
export const isTurnkeyConfigured = Boolean(
  publicEnv.turnkeyOrganizationId && publicEnv.turnkeyAuthProxyConfigId,
);

/** True when Reown Cloud project ID is set; external wallet UI needs it. */
export const isReownConfigured = Boolean(publicEnv.reownProjectId);
