"use client";

import type { TurnkeyProviderConfig } from "@turnkey/react-wallet-kit";
import { AppKitProvider, type AppKitProviderProps } from "@reown/appkit/react";
import {
  arbitrum,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  type AppKitNetwork,
} from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { http } from "wagmi";
import { createTurnkeyConnector } from "turnkey-wagmi-connector";
import { publicEnv } from "./env";

export const appChains = [
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  baseSepolia,
] as const;

export const lifiChains = [mainnet, base, arbitrum, optimism, polygon] as const;

const rpcOverrides = {
  [mainnet.id]: publicEnv.mainnetRpcUrl,
  [base.id]: publicEnv.baseRpcUrl,
  [arbitrum.id]: publicEnv.arbitrumRpcUrl,
  [optimism.id]: publicEnv.optimismRpcUrl,
  [polygon.id]: publicEnv.polygonRpcUrl,
  [baseSepolia.id]: publicEnv.baseSepoliaRpcUrl,
} as const;

function getRpcUrl(chainId: number, fallback: string) {
  return rpcOverrides[chainId as keyof typeof rpcOverrides] || fallback;
}

export const turnkeyConnector = createTurnkeyConnector({
  chains: appChains,
  walletLabel: "Turnkey Session",
});

export const wagmiAdapter = new WagmiAdapter({
  projectId: publicEnv.reownProjectId || "demo-project-id",
  networks: appChains as unknown as [AppKitNetwork, ...AppKitNetwork[]],
  connectors: [turnkeyConnector],
  transports: Object.fromEntries(
    appChains.map((chain) => [
      chain.id,
      http(getRpcUrl(chain.id, chain.rpcUrls.default.http[0] ?? "")),
    ]),
  ),
  ssr: true,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const appKitConfig: Omit<AppKitProviderProps, "children"> = {
  projectId: publicEnv.reownProjectId || "demo-project-id",
  adapters: [wagmiAdapter],
  networks: appChains as unknown as [AppKitNetwork, ...AppKitNetwork[]],
  defaultNetwork: base,
  metadata: {
    name: "Turnkey Wagmi Connector Demo",
    description:
      "Demo app for Turnkey Embedded Wallet Kit, Wagmi, Reown AppKit, and LI.FI widget compatibility.",
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
