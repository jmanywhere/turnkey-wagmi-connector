import {
  arbitrum as wagmiArbitrum,
  base as wagmiBase,
  baseSepolia as wagmiBaseSepolia,
  mainnet as wagmiMainnet,
  optimism as wagmiOptimism,
  polygon as wagmiPolygon,
} from "wagmi/chains";
import {
  arbitrum as appKitArbitrum,
  base as appKitBase,
  baseSepolia as appKitBaseSepolia,
  mainnet as appKitMainnet,
  optimism as appKitOptimism,
  polygon as appKitPolygon,
  type AppKitNetwork,
} from "@reown/appkit/networks";
import { publicEnv } from "./env";

type RpcChain = {
  id: number;
  name: string;
  rpcUrls: {
    default: {
      http: readonly string[];
    };
    public?: {
      http: readonly string[];
    };
  };
};

const rpcOverrides = {
  [wagmiMainnet.id]: publicEnv.mainnetRpcUrl,
  [wagmiBase.id]: publicEnv.baseRpcUrl,
  [wagmiArbitrum.id]: publicEnv.arbitrumRpcUrl,
  [wagmiOptimism.id]: publicEnv.optimismRpcUrl,
  [wagmiPolygon.id]: publicEnv.polygonRpcUrl,
  [wagmiBaseSepolia.id]: publicEnv.baseSepoliaRpcUrl,
} as const;

export const plainSwitchTargets = [
  { id: wagmiBase.id, label: "Base" },
  { id: wagmiBaseSepolia.id, label: "Base Sepolia" },
  { id: wagmiArbitrum.id, label: "Arbitrum" },
  { id: wagmiOptimism.id, label: "Optimism" },
  { id: wagmiMainnet.id, label: "Mainnet" },
] as const;

export const widgetSwitchTargets = [
  { id: wagmiBase.id, label: "Base" },
  { id: wagmiArbitrum.id, label: "Arbitrum" },
  { id: wagmiOptimism.id, label: "Optimism" },
] as const;

export const baseChains = [
  wagmiBaseSepolia,
  wagmiBase,
  wagmiArbitrum,
  wagmiOptimism,
  wagmiPolygon,
  wagmiMainnet,
] as const;

export const appKitChains = [
  appKitMainnet,
  appKitBase,
  appKitArbitrum,
  appKitOptimism,
  appKitPolygon,
  appKitBaseSepolia,
] as const;

export function getRpcUrl(chainId: number, fallback: string) {
  return rpcOverrides[chainId as keyof typeof rpcOverrides] || fallback;
}

export function withRpcOverride<TChain extends RpcChain>(
  chain: TChain,
  rpcUrl: string,
) {
  const resolvedRpcUrl = rpcUrl || chain.rpcUrls.default.http[0] || "";

  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: {
        ...chain.rpcUrls.default,
        http: [resolvedRpcUrl],
      },
      public: chain.rpcUrls.public
        ? {
            ...chain.rpcUrls.public,
            http: [resolvedRpcUrl],
          }
        : undefined,
    },
  };
}

export const appKitNetworks = appKitChains.map((chain) =>
  withRpcOverride(chain, getRpcUrl(chain.id, chain.rpcUrls.default.http[0] ?? "")),
) as unknown as [AppKitNetwork, ...AppKitNetwork[]];
