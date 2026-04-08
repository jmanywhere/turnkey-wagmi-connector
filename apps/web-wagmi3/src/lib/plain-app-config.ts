"use client";

import type { TurnkeyProviderConfig } from "@turnkey/react-wallet-kit";
import { createConfig, http } from "wagmi";
import { createTurnkeyConnector } from "turnkey-wagmi-connector";
import { publicEnv } from "./env";
import { baseChains, getRpcUrl, withRpcOverride } from "./network-config";

export const appChains = baseChains.map((chain) =>
  withRpcOverride(chain, getRpcUrl(chain.id, chain.rpcUrls.default.http[0] ?? "")),
) as unknown as typeof baseChains;

export const turnkeyConnector = createTurnkeyConnector({
  chains: appChains,
  walletLabel: "Turnkey Session",
});

export const wagmiConfig = createConfig({
  chains: appChains,
  connectors: [turnkeyConnector],
  transports: Object.fromEntries(
    appChains.map((chain) => [
      chain.id,
      http(getRpcUrl(chain.id, chain.rpcUrls.default.http[0] ?? "")),
    ]),
  ) as Record<(typeof appChains)[number]["id"], ReturnType<typeof http>>,
  ssr: true,
});

export const turnkeyProviderConfig: TurnkeyProviderConfig = {
  apiBaseUrl: publicEnv.turnkeyApiBaseUrl,
  organizationId: publicEnv.turnkeyOrganizationId || "demo-org-id",
  authProxyConfigId: publicEnv.turnkeyAuthProxyConfigId || undefined,
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
  ui: {
    darkMode: false,
    borderRadius: 24,
    backgroundBlur: 18,
    preferLargeActionButtons: true,
    renderModalInProvider: true,
    supressMissingStylesError: true,
  },
};
