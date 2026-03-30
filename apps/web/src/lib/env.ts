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

export const isTurnkeyConfigured = Boolean(
  publicEnv.turnkeyOrganizationId && publicEnv.turnkeyAuthProxyConfigId,
);

export const isReownConfigured = Boolean(publicEnv.reownProjectId);
