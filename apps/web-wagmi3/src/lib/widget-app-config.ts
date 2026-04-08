"use client";

import type { TurnkeyProviderConfig } from "@turnkey/react-wallet-kit";
import { AppKitProvider, type AppKitProviderProps } from "@reown/appkit/react";
import { base } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { http } from "wagmi";
import { createTurnkeyConnector } from "turnkey-wagmi-connector";
import { publicEnv } from "./env";
import {
  appKitNetworks,
  baseChains,
  getRpcUrl,
  withRpcOverride,
} from "./network-config";

const connectorChains = baseChains.map((chain) =>
  withRpcOverride(chain, getRpcUrl(chain.id, chain.rpcUrls.default.http[0] ?? "")),
) as unknown as typeof baseChains;

export const turnkeyConnector = createTurnkeyConnector({
  chains: connectorChains,
  walletLabel: "Turnkey Session",
});

export const wagmiAdapter = new WagmiAdapter({
  projectId: publicEnv.reownProjectId || "demo-project-id",
  networks: appKitNetworks,
  connectors: [turnkeyConnector],
  transports: Object.fromEntries(
    appKitNetworks.map((chain) => [
      Number(chain.id),
      http(getRpcUrl(Number(chain.id), chain.rpcUrls.default.http[0] ?? "")),
    ]),
  ),
  ssr: true,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const appKitConfig: Omit<AppKitProviderProps, "children"> = {
  projectId: publicEnv.reownProjectId || "demo-project-id",
  adapters: [wagmiAdapter],
  networks: appKitNetworks,
  defaultNetwork: base,
  metadata: {
    name: "Turnkey Wagmi 3 Demo",
    description:
      "Wagmi 3 demo for Turnkey Embedded Wallet Kit, Reown AppKit, and LI.FI widget compatibility.",
    url: "https://github.com/jmanywhere/turnkey-wagmi-connector",
    icons: ["https://avatars.githubusercontent.com/u/14957082"],
  },
  themeMode: "light",
  showWallets: true,
  allowUnsupportedChain: true,
};

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

export { AppKitProvider };
