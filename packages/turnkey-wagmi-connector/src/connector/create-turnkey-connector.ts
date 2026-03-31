import { createEIP1193Provider, type TurnkeyEIP1193Provider } from "@turnkey/eip-1193-provider";
import { createAccountWithAddress } from "@turnkey/viem";
import {
  ProviderNotFoundError,
  SwitchChainNotSupportedError,
  createConnector,
  type CreateConnectorFn,
} from "wagmi";
import {
  getAddress,
  hexToBytes,
  type AddEthereumChainParameter,
  type Address,
  type Chain,
  type EIP1193Provider,
  type Hex,
} from "viem";
import { getTurnkeyRuntimeState } from "../provider/runtime-store";

export type CreateTurnkeyConnectorOptions = {
  chains: readonly [Chain, ...Chain[]];
  walletLabel?: string;
  icon?: string;
};

const DEFAULT_ID = "turnkey";
type TurnkeyConnectorProvider = Awaited<ReturnType<typeof createEIP1193Provider>>;

type ProviderCache = {
  provider?: TurnkeyConnectorProvider;
  chainId?: number;
};

function toProviderChain(chain: Chain): AddEthereumChainParameter {
  return {
    chainId: `0x${chain.id.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls.default.http,
    blockExplorerUrls: chain.blockExplorers?.default
      ? [chain.blockExplorers.default.url]
      : undefined,
  };
}

async function getOrCreateProvider(
  configuredChains: readonly Chain[],
  chain: Chain,
  cache: ProviderCache,
): Promise<TurnkeyConnectorProvider> {
  const runtime = getTurnkeyRuntimeState();
  if (!runtime.httpClient || !runtime.embeddedAccount || !runtime.session?.organizationId) {
    throw new ProviderNotFoundError();
  }

  if (!cache.provider) {
    const provider = await createEIP1193Provider({
      walletId: runtime.embeddedAccount.walletId as never,
      organizationId: runtime.session.organizationId as never,
      turnkeyClient: runtime.httpClient as never,
      chains: configuredChains.map(toProviderChain),
    });

    cache.provider = wrapProvider(provider);
  }

  if (cache.chainId !== chain.id) {
    await cache.provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chain.id.toString(16)}` }],
    } as {
      method: "wallet_switchEthereumChain";
      params: [{ chainId: Hex }];
    });
  }

  cache.chainId = chain.id;
  return cache.provider;
}

function normalizeSignMessageInput(message: string) {
  return message.startsWith("0x")
    ? { raw: hexToBytes(message as Hex) }
    : message;
}

function wrapProvider(provider: TurnkeyConnectorProvider): TurnkeyConnectorProvider {
  return {
    on: provider.on.bind(provider),
    removeListener: provider.removeListener.bind(provider),
    async request(args) {
      if (args.method === "personal_sign") {
        const runtime = getTurnkeyRuntimeState();
        if (!runtime.httpClient || !runtime.session?.organizationId) {
          throw new ProviderNotFoundError();
        }

        const [message, signWith] = args.params as [string, Address];
        const account = createAccountWithAddress({
          client: runtime.httpClient as never,
          organizationId: runtime.session.organizationId,
          signWith: getAddress(signWith),
          ethereumAddress: getAddress(signWith),
        });

        return account.signMessage({
          message: normalizeSignMessageInput(message),
        });
      }

      return provider.request(args as never);
    },
  } as TurnkeyConnectorProvider;
}

export function createTurnkeyConnector({
  chains,
  walletLabel = "Turnkey Embedded Wallet",
  icon,
}: CreateTurnkeyConnectorOptions): CreateConnectorFn<TurnkeyConnectorProvider> {
  const providerCache: ProviderCache = {};
  let currentChainId = chains[0].id;

  return createConnector<TurnkeyConnectorProvider>(({ chains: configuredChains, emitter }) => ({
    id: DEFAULT_ID,
    name: walletLabel,
    type: "turnkey",
    icon,
    async connect({ chainId } = {}) {
      const runtime = getTurnkeyRuntimeState();
      if (!runtime.embeddedAccount) {
        throw new ProviderNotFoundError();
      }

      const nextChain =
        configuredChains.find((chain) => chain.id === (chainId ?? currentChainId)) ??
        configuredChains[0];

      const provider = await getOrCreateProvider(configuredChains, nextChain, providerCache);
      await provider.request({ method: "eth_requestAccounts" });

      currentChainId = nextChain.id;

      emitter.emit("connect", {
        accounts: [runtime.embeddedAccount.address],
        chainId: nextChain.id,
      });

      return {
        accounts: [runtime.embeddedAccount.address],
        chainId: nextChain.id,
      } as never;
    },
    async disconnect() {
      providerCache.provider = undefined;
      providerCache.chainId = undefined;
      emitter.emit("disconnect");
    },
    async getAccounts() {
      const runtime = getTurnkeyRuntimeState();
      return runtime.embeddedAccount ? [runtime.embeddedAccount.address] : [];
    },
    async getChainId() {
      return currentChainId;
    },
    async getProvider({ chainId } = {}) {
      const chain =
        configuredChains.find((item) => item.id === (chainId ?? currentChainId)) ??
        configuredChains[0];
      currentChainId = chain.id;
      return getOrCreateProvider(configuredChains, chain, providerCache);
    },
    async isAuthorized() {
      const runtime = getTurnkeyRuntimeState();
      return Boolean(
        runtime.authState === "authenticated" &&
          runtime.session &&
          runtime.embeddedAccount &&
          runtime.httpClient,
      );
    },
    async switchChain({ chainId }) {
      const chain = configuredChains.find((item) => item.id === chainId);
      if (!chain) {
        throw new SwitchChainNotSupportedError({
          connector: {
            id: DEFAULT_ID,
            name: walletLabel,
            type: "turnkey",
          } as never,
        });
      }

      await getOrCreateProvider(configuredChains, chain, providerCache);
      currentChainId = chain.id;
      emitter.emit("change", { chainId: chain.id });

      return chain;
    },
    onAccountsChanged(accounts: string[]) {
      emitter.emit("change", {
        accounts: accounts as Address[],
      });
    },
    onChainChanged(chainId: string | { chainId: string }) {
      const nextChainId = typeof chainId === "string" ? chainId : chainId.chainId;
      const normalized = Number.parseInt(nextChainId, 16);
      if (Number.isNaN(normalized)) return;
      currentChainId = normalized;
      emitter.emit("change", { chainId: normalized });
    },
    onDisconnect() {
      providerCache.provider = undefined;
      providerCache.chainId = undefined;
      emitter.emit("disconnect");
    },
  }));
}
