"use client";

/**
 * Demo integration layer: maps `publicEnv` into Wagmi, Reown AppKit, and Turnkey
 * Embedded Wallet Kit. Not part of `turnkey-wagmi-connector`; safe to replace in
 * your app with your own config builders.
 */
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

/** Chains registered on both the Turnkey connector and AppKit. */
export const appChains = [
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  baseSepolia,
] as const;

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

function withRpcOverride<TChain extends (typeof appChains)[number]>(
  chain: TChain,
  rpcUrl: string,
) {
  const resolvedRpcUrl = rpcUrl || chain.rpcUrls.default.http[0] || "";
  const publicRpcUrls = "public" in chain.rpcUrls ? chain.rpcUrls.public : undefined;

  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: {
        ...chain.rpcUrls.default,
        http: [resolvedRpcUrl],
      },
      public: publicRpcUrls
        ? {
            ...publicRpcUrls,
            http: [resolvedRpcUrl],
          }
        : undefined,
    },
  };
}

const connectorChains = appChains.map((chain) =>
  withRpcOverride(chain, getRpcUrl(chain.id, chain.rpcUrls.default.http[0] ?? "")),
) as unknown as typeof appChains;

const appNetworks = connectorChains.map((chain) => {
  const rpcUrl = getRpcUrl(chain.id, chain.rpcUrls.default.http[0] ?? "");
  return withRpcOverride(chain, rpcUrl);
}) as unknown as [AppKitNetwork, ...AppKitNetwork[]];

/** Single Turnkey-backed Wagmi connector for this fixture. */
export const turnkeyConnector = createTurnkeyConnector({
  chains: connectorChains,
  walletLabel: "Turnkey Session",
});

/** Reown adapter: bundles networks, transports, and `turnkeyConnector`. */
export const wagmiAdapter = new WagmiAdapter({
  projectId: publicEnv.reownProjectId || "demo-project-id",
  networks: appNetworks,
  connectors: [turnkeyConnector],
  transports: Object.fromEntries(
    appNetworks.map((chain) => [
      Number(chain.id),
      http(getRpcUrl(Number(chain.id), chain.rpcUrls.default.http[0] ?? "")),
    ]),
  ),
  ssr: true,
});

/** Wagmi config consumed by `WagmiProvider` in `providers.tsx`. */
export const wagmiConfig = wagmiAdapter.wagmiConfig;

/** Props (except `children`) for root `AppKitProvider`. */
export const appKitConfig: Omit<AppKitProviderProps, "children"> = {
  projectId: publicEnv.reownProjectId || "demo-project-id",
  adapters: [wagmiAdapter],
  networks: appNetworks,
  defaultNetwork: base,
  metadata: {
    name: "Turnkey Wagmi Connector NPM Demo",
    description:
      "Demo app that consumes turnkey-wagmi-connector from npm with Turnkey Embedded Wallet Kit, Wagmi, Reown AppKit, and LI.FI.",
    url: "https://github.com/jmanywhere/turnkey-wagmi-connector",
    icons: ["https://avatars.githubusercontent.com/u/14957082"],
  },
  themeMode: undefined,
  showWallets: true,
  allowUnsupportedChain: true,
};

/** Turnkey Embedded Wallet Kit provider options; merged with theme in `providers.tsx`. */
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

/** Re-export so `providers.tsx` can import App Kit from one module. */
export { AppKitProvider };
