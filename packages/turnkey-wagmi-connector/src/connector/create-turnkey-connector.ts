import { createEIP1193Provider } from "@turnkey/eip-1193-provider";
import { createAccountWithAddress } from "@turnkey/viem";
import {
  ProviderNotFoundError,
  SwitchChainNotSupportedError,
  createConnector,
  type CreateConnectorFn,
} from "wagmi";
import {
  createWalletClient,
  custom,
  getAddress,
  hexToBytes,
  numberToHex,
  type AddEthereumChainParameter,
  type Address,
  type Chain,
  type Hex,
  type TypedDataDefinition,
} from "viem";
import { prepareTransactionRequest as viemPrepareTransactionRequest } from "viem/actions";
import { getTurnkeyRuntimeState } from "../provider/runtime-store";

export type CreateTurnkeyConnectorOptions = {
  chains: readonly [Chain, ...Chain[]];
  walletLabel?: string;
  icon?: string;
};

const DEFAULT_ID = "turnkey";
const TRANSACTION_RECEIPT_POLL_INTERVAL_MS = 1_500;
const TRANSACTION_RECEIPT_TIMEOUT_MS = 180_000;
type TurnkeyConnectorProvider = Awaited<ReturnType<typeof createEIP1193Provider>>;
type ConnectorChain = Chain;

type ProviderCache = {
  provider?: TurnkeyConnectorProvider;
  chainId?: number;
  providerChainIds: Set<string>;
};

type ProviderRequestArgs = {
  method: string;
  params?: readonly unknown[] | Record<string, unknown>;
};

type PersonalSignParams = [message: string, signWith: Address];
type TypedDataRequestParams = [signWith: Address, typedData: string | Record<string, unknown>];
type TransactionRequestParam = Record<string, unknown>;
type ReceiptWaitKey = `${Lowercase<string>}:${Lowercase<string>}`;
type DebugEntry = {
  event: string;
  at: number;
  payload: Record<string, unknown>;
};
type PrepareTransactionParameter =
  | "blobVersionedHashes"
  | "chainId"
  | "fees"
  | "gas"
  | "nonce"
  | "sidecars"
  | "type";

const ALLOWED_TRANSACTION_KEYS = new Set([
  "accessList",
  "authorizationList",
  "blobVersionedHashes",
  "blobs",
  "chainId",
  "data",
  "from",
  "gas",
  "gasPrice",
  "maxFeePerBlobGas",
  "maxFeePerGas",
  "maxPriorityFeePerGas",
  "nonce",
  "to",
  "type",
  "value",
]);
const LEGACY_TRANSACTION_TYPE = "0x0";
const EIP2930_TRANSACTION_TYPE = "0x1";
const EIP1559_TRANSACTION_TYPE = "0x2";
const EIP4844_TRANSACTION_TYPE = "0x3";
const EIP7702_TRANSACTION_TYPE = "0x4";
type ViemTransactionType = "legacy" | "eip2930" | "eip1559" | "eip4844" | "eip7702";

declare global {
  interface Window {
    __TURNKEY_WAGMI_DEBUG__?: DebugEntry[];
  }
}

function pushDebugEntry(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  const entries = window.__TURNKEY_WAGMI_DEBUG__ ?? [];
  entries.push({
    event,
    at: Date.now(),
    payload,
  });
  window.__TURNKEY_WAGMI_DEBUG__ = entries.slice(-50);
}

function toProviderChain(chain: ConnectorChain): AddEthereumChainParameter {
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
  connectorChains: readonly ConnectorChain[],
  chain: ConnectorChain,
  cache: ProviderCache,
  resolveChain?: (chainId: unknown) => ConnectorChain | undefined,
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
      chains: connectorChains.map(toProviderChain),
    });

    cache.provider = wrapProvider(provider, resolveChain);
    cache.providerChainIds = new Set(
      connectorChains
        .map((item) => normalizeChainIdHex(item.id)?.toLowerCase())
        .filter((item): item is string => Boolean(item)),
    );
  }

  const normalizedTargetChainId = normalizeChainIdHex(chain.id)?.toLowerCase();
  if (normalizedTargetChainId && !cache.providerChainIds.has(normalizedTargetChainId)) {
    await cache.provider.request({
      method: "wallet_addEthereumChain",
      params: [toProviderChain(chain)],
    } as never);
    cache.providerChainIds.add(normalizedTargetChainId);
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

function normalizeProviderRequestArgs(args: ProviderRequestArgs): ProviderRequestArgs {
  if (!args.params) {
    return args;
  }

  if (
    (args.method === "wallet_switchEthereumChain" ||
      args.method === "wallet_addEthereumChain" ||
      args.method === "wallet_requestPermissions" ||
      args.method === "eth_sendTransaction" ||
      args.method === "eth_signTransaction") &&
    !Array.isArray(args.params)
  ) {
    return {
      ...args,
      params: [args.params],
    } as ProviderRequestArgs;
  }

  if (args.method === "personal_sign" && !Array.isArray(args.params)) {
    const params = args.params as { message?: string; data?: string; address?: Address; account?: Address };
    const message = params.message ?? params.data;
    const signWith = params.address ?? params.account;

    if (message && signWith) {
      return {
        ...args,
        params: [message, signWith],
      } as ProviderRequestArgs;
    }
  }

  if (args.method === "eth_signTypedData_v4" && !Array.isArray(args.params)) {
    const params = args.params as {
      address?: Address;
      account?: Address;
      typedData?: string | Record<string, unknown>;
      data?: string | Record<string, unknown>;
      message?: string | Record<string, unknown>;
    };
    const signWith = params.address ?? params.account;
    const typedData = params.typedData ?? params.data ?? params.message;

    if (signWith && typedData) {
      return {
        ...args,
        params: [signWith, typedData],
      } as ProviderRequestArgs;
    }
  }

  return args;
}

function parseTypedData(typedData: string | Record<string, unknown>) {
  if (typeof typedData === "string") {
    return JSON.parse(typedData) as TypedDataDefinition;
  }

  return typedData as TypedDataDefinition;
}

function normalizeQuantity(value: unknown): Hex | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      return value as Hex;
    }

    if (/^\d+$/.test(value)) {
      return numberToHex(BigInt(value));
    }

    return undefined;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }

    return numberToHex(BigInt(value));
  }

  if (typeof value === "bigint") {
    if (value < 0n) {
      return undefined;
    }

    return numberToHex(value);
  }

  return undefined;
}

export function normalizeTransactionType(value: unknown): Hex | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const normalizedValue = value.toLowerCase();

    if (normalizedValue === "legacy") {
      return LEGACY_TRANSACTION_TYPE;
    }

    if (normalizedValue === "eip2930") {
      return EIP2930_TRANSACTION_TYPE;
    }

    if (normalizedValue === "eip1559") {
      return EIP1559_TRANSACTION_TYPE;
    }

    if (normalizedValue === "eip4844") {
      return EIP4844_TRANSACTION_TYPE;
    }

    if (normalizedValue === "eip7702") {
      return EIP7702_TRANSACTION_TYPE;
    }
  }

  return normalizeQuantity(value);
}

function toViemTransactionType(value: unknown): ViemTransactionType | undefined {
  const normalizedType = normalizeTransactionType(value);

  switch (normalizedType) {
    case LEGACY_TRANSACTION_TYPE:
      return "legacy";
    case EIP2930_TRANSACTION_TYPE:
      return "eip2930";
    case EIP1559_TRANSACTION_TYPE:
      return "eip1559";
    case EIP4844_TRANSACTION_TYPE:
      return "eip4844";
    case EIP7702_TRANSACTION_TYPE:
      return "eip7702";
    default:
      return undefined;
  }
}

function toBigIntQuantity(value: unknown): bigint | undefined {
  const normalizedValue = normalizeQuantity(value);
  return normalizedValue !== undefined ? BigInt(normalizedValue) : undefined;
}

function toNumberIndex(value: unknown): number | undefined {
  const normalizedValue = normalizeQuantity(value);
  return normalizedValue !== undefined ? Number(normalizedValue) : undefined;
}

function toViemTransactionRequest(transaction: TransactionRequestParam): TransactionRequestParam {
  const request = {
    accessList: transaction.accessList,
    authorizationList: transaction.authorizationList,
    blobVersionedHashes: transaction.blobVersionedHashes,
    blobs: transaction.blobs,
    chainId: toNumberIndex(transaction.chainId),
    data: transaction.data,
    gas: toBigIntQuantity(transaction.gas),
    gasPrice: toBigIntQuantity(transaction.gasPrice),
    maxFeePerBlobGas: toBigIntQuantity(transaction.maxFeePerBlobGas),
    maxFeePerGas: toBigIntQuantity(transaction.maxFeePerGas),
    maxPriorityFeePerGas: toBigIntQuantity(transaction.maxPriorityFeePerGas),
    nonce: toNumberIndex(transaction.nonce),
    to: transaction.to,
    type: toViemTransactionType(transaction.type),
    value: toBigIntQuantity(transaction.value),
  } satisfies TransactionRequestParam;

  return Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined),
  ) as TransactionRequestParam;
}

function appendFeesParameterIfNeeded(
  transaction: TransactionRequestParam,
  parameters: PrepareTransactionParameter[],
) {
  if (
    transaction.gasPrice === undefined &&
    transaction.maxFeePerGas === undefined &&
    transaction.maxPriorityFeePerGas === undefined
  ) {
    parameters.push("fees");
  }
}

/** Matches legacy behavior: only ask viem to fill `gas` when the request omits it. */
function getPrepareTransactionParametersPreserveUpstreamGas(
  transaction: TransactionRequestParam,
): readonly PrepareTransactionParameter[] {
  const parameters: PrepareTransactionParameter[] = ["blobVersionedHashes", "chainId", "nonce", "type"];

  if (transaction.gas === undefined) {
    parameters.push("gas");
  }

  appendFeesParameterIfNeeded(transaction, parameters);

  return parameters;
}

/** Always request `gas` so viem runs `estimateGas` even when a dapp sent a padded limit. */
function getPrepareTransactionParametersWithGasEstimate(
  transaction: TransactionRequestParam,
): readonly PrepareTransactionParameter[] {
  const parameters: PrepareTransactionParameter[] = [
    "blobVersionedHashes",
    "chainId",
    "nonce",
    "type",
    "gas",
  ];

  appendFeesParameterIfNeeded(transaction, parameters);

  return parameters;
}

function normalizePreparedTransactionInput(
  transaction: TransactionRequestParam,
): TransactionRequestParam {
  const normalizedType = normalizeTransactionType(transaction.type);
  const hasLegacyFees = transaction.gasPrice !== undefined;
  const hasEip1559Fees =
    transaction.maxFeePerGas !== undefined || transaction.maxPriorityFeePerGas !== undefined;

  if (
    hasLegacyFees &&
    !hasEip1559Fees &&
    (normalizedType === undefined || normalizedType === EIP1559_TRANSACTION_TYPE)
  ) {
    return {
      ...transaction,
      type: transaction.accessList !== undefined ? EIP2930_TRANSACTION_TYPE : LEGACY_TRANSACTION_TYPE,
    };
  }

  return transaction;
}

/** When upstream `gas` is more than 2× the RPC estimate, cap gas to 130% of that estimate (quote padding guard). */
const UPSTREAM_GAS_EXCESS_OVER_ESTIMATE = 2n;
const ESTIMATE_GAS_HEADROOM_NUM = 130n;
const ESTIMATE_GAS_HEADROOM_DEN = 100n;

export function mergePreparedTransactionRequest(
  originalTransaction: TransactionRequestParam,
  preparedTransaction: TransactionRequestParam,
): TransactionRequestParam {
  const mergedTransaction = { ...preparedTransaction };

  const oGas = toBigIntQuantity(originalTransaction.gas);
  const pGas = toBigIntQuantity(preparedTransaction.gas);

  if (oGas !== undefined && pGas !== undefined) {
    let chosen: bigint;
    if (oGas > pGas * UPSTREAM_GAS_EXCESS_OVER_ESTIMATE) {
      chosen = (pGas * ESTIMATE_GAS_HEADROOM_NUM) / ESTIMATE_GAS_HEADROOM_DEN;
    } else if (oGas > pGas) {
      chosen = oGas;
    } else {
      chosen = pGas;
    }

    mergedTransaction.gas = numberToHex(chosen);
  } else if (oGas !== undefined && pGas === undefined) {
    mergedTransaction.gas = originalTransaction.gas;
  }

  if (preparedTransaction.maxFeePerBlobGas === undefined && originalTransaction.maxFeePerBlobGas !== undefined) {
    mergedTransaction.maxFeePerBlobGas = originalTransaction.maxFeePerBlobGas;
  }

  return mergedTransaction;
}

function reconcileFeeModel(transaction: TransactionRequestParam): TransactionRequestParam {
  const hasLegacyFees = transaction.gasPrice !== undefined;
  const hasEip1559Fees =
    transaction.maxFeePerGas !== undefined || transaction.maxPriorityFeePerGas !== undefined;
  const normalizedType = normalizeTransactionType(transaction.type);

  if (hasLegacyFees && hasEip1559Fees) {
    const { gasPrice: _gasPrice, ...withoutGasPrice } = transaction;
    return reconcileFeeModel(withoutGasPrice);
  }

  if (hasLegacyFees && !hasEip1559Fees) {
    if (normalizedType === EIP2930_TRANSACTION_TYPE) {
      return transaction;
    }

    return {
      ...transaction,
      type: LEGACY_TRANSACTION_TYPE,
    };
  }

  if (hasEip1559Fees) {
    if (
      normalizedType === undefined ||
      normalizedType === LEGACY_TRANSACTION_TYPE ||
      normalizedType === EIP2930_TRANSACTION_TYPE
    ) {
      return {
        ...transaction,
        type: EIP1559_TRANSACTION_TYPE,
      };
    }
  }

  return transaction;
}

export function normalizeTransactionRequestParam(transaction: TransactionRequestParam): TransactionRequestParam {
  const normalizedInput = {
    ...transaction,
    ...(transaction.gas === undefined && transaction.gasLimit !== undefined
      ? { gas: transaction.gasLimit }
      : {}),
  };

  const normalized = Object.fromEntries(
    Object.entries(normalizedInput).filter(([key]) => ALLOWED_TRANSACTION_KEYS.has(key)),
  ) as TransactionRequestParam;

  const derivedChainId = (() => {
    if (normalized.chainId !== undefined) {
      return normalized.chainId;
    }

    const chain = transaction.chain;
    if (!chain || typeof chain !== "object") {
      return undefined;
    }

    const candidate = (chain as { id?: unknown }).id;
    return candidate;
  })();

  if (derivedChainId !== undefined) {
    normalized.chainId = derivedChainId;
  }

  const quantityKeys = [
    "chainId",
    "gas",
    "gasPrice",
    "maxFeePerBlobGas",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "nonce",
    "value",
  ] as const;

  for (const key of quantityKeys) {
    const normalizedValue = normalizeQuantity(normalized[key]);
    if (normalizedValue !== undefined) {
      normalized[key] = normalizedValue;
    }
  }

  const normalizedType = normalizeTransactionType(normalized.type);
  if (normalizedType !== undefined) {
    normalized.type = normalizedType;
  }

  if (typeof normalized.from === "string") {
    normalized.from = getAddress(normalized.from);
  }

  if (typeof normalized.to === "string") {
    normalized.to = getAddress(normalized.to);
  }

  return reconcileFeeModel(normalized);
}

function normalizeChainIdHex(chainId: unknown): Hex | undefined {
  if (chainId && typeof chainId === "object") {
    const candidate =
      "chainId" in chainId
        ? (chainId as { chainId?: unknown }).chainId
        : "id" in chainId
          ? (chainId as { id?: unknown }).id
          : undefined;

    if (candidate !== undefined) {
      return normalizeChainIdHex(candidate);
    }
  }

  if (typeof chainId === "string") {
    if (chainId.includes(":")) {
      const candidate = chainId.split(":").pop();
      if (candidate) {
        return normalizeChainIdHex(candidate);
      }
    }

    if (chainId.startsWith("0x")) {
      return chainId as Hex;
    }

    if (/^\d+$/.test(chainId)) {
      return numberToHex(BigInt(chainId));
    }
  }

  if (typeof chainId === "number" && Number.isFinite(chainId) && chainId >= 0) {
    return numberToHex(BigInt(chainId));
  }

  if (typeof chainId === "bigint" && chainId >= 0n) {
    return numberToHex(chainId);
  }

  return undefined;
}

function findConfiguredChain(configuredChains: readonly ConnectorChain[], chainId: unknown) {
  const normalizedChainId = normalizeChainIdHex(chainId);
  if (!normalizedChainId) {
    return undefined;
  }

  return configuredChains.find(
    (item) => normalizeChainIdHex(item.id)?.toLowerCase() === normalizedChainId.toLowerCase(),
  );
}

function buildDynamicChain(
  chainId: unknown,
  addEthereumChainParameter?: {
    chainName?: string;
    nativeCurrency?: AddEthereumChainParameter["nativeCurrency"];
    rpcUrls?: readonly string[];
    blockExplorerUrls?: readonly string[];
  },
): Chain | undefined {
  const normalizedChainId = normalizeChainIdHex(chainId);
  const numericChainId = normalizedChainId ? Number.parseInt(normalizedChainId, 16) : Number.NaN;
  const fallbackRpcUrls = addEthereumChainParameter?.rpcUrls?.filter(Boolean) ?? [];

  if (!normalizedChainId || Number.isNaN(numericChainId) || !addEthereumChainParameter || fallbackRpcUrls.length === 0) {
    return undefined;
  }

  return {
    id: numericChainId,
    name: addEthereumChainParameter.chainName ?? `Chain ${numericChainId}`,
    nativeCurrency: addEthereumChainParameter.nativeCurrency ?? {
      name: "Native Token",
      symbol: "NATIVE",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: fallbackRpcUrls,
      },
    },
    blockExplorers: addEthereumChainParameter.blockExplorerUrls?.[0]
      ? {
          default: {
            name: addEthereumChainParameter.chainName ?? `Chain ${numericChainId}`,
            url: addEthereumChainParameter.blockExplorerUrls[0],
          },
        }
      : undefined,
  } as Chain;
}

function sameChainId(left: unknown, right: unknown) {
  const leftHex = normalizeChainIdHex(left);
  const rightHex = normalizeChainIdHex(right);
  return Boolean(leftHex && rightHex && leftHex.toLowerCase() === rightHex.toLowerCase());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTransactionReceipt(
  provider: TurnkeyConnectorProvider,
  hash: Hex,
  timeoutMs = TRANSACTION_RECEIPT_TIMEOUT_MS,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    } as never);

    if (receipt) {
      return receipt;
    }

    await sleep(TRANSACTION_RECEIPT_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for transaction receipt: ${hash}`);
}

function getTransactionQueueKey(transaction: TransactionRequestParam): ReceiptWaitKey | undefined {
  if (typeof transaction.from !== "string") {
    return undefined;
  }

  const normalizedChainId = normalizeChainIdHex(transaction.chainId);
  if (!normalizedChainId) {
    return undefined;
  }

  return `${transaction.from.toLowerCase()}:${normalizedChainId.toLowerCase()}` as ReceiptWaitKey;
}

export async function prepareProviderTransactionRequest(
  provider: TurnkeyConnectorProvider,
  transaction: TransactionRequestParam,
  resolveChain?: (chainId: unknown) => ConnectorChain | undefined,
) {
  const normalizedTransaction = normalizeTransactionRequestParam(transaction);
  const account =
    typeof normalizedTransaction.from === "string"
      ? getAddress(normalizedTransaction.from)
      : undefined;
  const fallbackChainId =
    normalizedTransaction.chainId ?? (await provider.request({ method: "eth_chainId" } as never));
  const chain = resolveChain?.(normalizedTransaction.chainId) ?? resolveChain?.(fallbackChainId);
  const client = createWalletClient({
    account,
    chain,
    transport: custom(provider),
  });

  const sharedPrepareArgs = {
    ...(account ? { account } : {}),
    ...(chain ? { chain } : {}),
    ...(chain || normalizedTransaction.chainId === undefined
      ? {}
      : { chainId: toNumberIndex(normalizedTransaction.chainId) }),
  };

  let preparedRequest: Awaited<ReturnType<typeof viemPrepareTransactionRequest>>;

  try {
    const normalizedForEstimate = { ...normalizedTransaction };
    delete normalizedForEstimate.gas;

    const preparedInput = normalizePreparedTransactionInput(
      toViemTransactionRequest(normalizedForEstimate),
    );

    preparedRequest = await viemPrepareTransactionRequest(client, {
      ...preparedInput,
      ...sharedPrepareArgs,
      parameters: getPrepareTransactionParametersWithGasEstimate(normalizedTransaction),
    } as never);
  } catch {
    let withGas: TransactionRequestParam = { ...normalizedTransaction };

    try {
      if (
        account !== undefined &&
        typeof normalizedTransaction.to === "string" &&
        typeof normalizedTransaction.data === "string"
      ) {
        const estimateTx: Record<string, string> = {
          from: account,
          to: normalizedTransaction.to,
          data: normalizedTransaction.data,
        };
        const valueField = normalizedTransaction.value;
        estimateTx.value =
          valueField !== undefined && valueField !== null ? String(valueField) : "0x0";

        const estHex = (await provider.request({
          method: "eth_estimateGas",
          params: [estimateTx],
        } as never)) as string;

        if (typeof estHex === "string" && estHex.startsWith("0x")) {
          const raw = BigInt(estHex);
          const padded = (raw * 120n) / 100n;
          withGas = {
            ...normalizedTransaction,
            gas: numberToHex(padded),
          };
        }
      }
    } catch {
      withGas = { ...normalizedTransaction };
    }

    const preparedInput = normalizePreparedTransactionInput(toViemTransactionRequest(withGas));

    preparedRequest = await viemPrepareTransactionRequest(client, {
      ...preparedInput,
      ...sharedPrepareArgs,
      parameters: getPrepareTransactionParametersPreserveUpstreamGas(withGas),
    } as never);
  }

  return mergePreparedTransactionRequest(
    normalizedTransaction,
    normalizeTransactionRequestParam(preparedRequest as TransactionRequestParam),
  );
}

function wrapProvider(
  provider: TurnkeyConnectorProvider,
  resolveChain?: (chainId: unknown) => ConnectorChain | undefined,
): TurnkeyConnectorProvider {
  const pendingReceiptByKey = new Map<ReceiptWaitKey, Promise<unknown>>();
  const sendMutexByKey = new Map<ReceiptWaitKey, Promise<void>>();

  return {
    on: provider.on.bind(provider),
    removeListener: provider.removeListener.bind(provider),
    async request(args) {
      const normalizedArgs = normalizeProviderRequestArgs(args as ProviderRequestArgs);

      if (normalizedArgs.method === "personal_sign") {
        const runtime = getTurnkeyRuntimeState();
        if (!runtime.httpClient || !runtime.session?.organizationId) {
          throw new ProviderNotFoundError();
        }

        const [message, signWith] = normalizedArgs.params as PersonalSignParams;
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

      if (normalizedArgs.method === "eth_signTypedData_v4") {
        const runtime = getTurnkeyRuntimeState();
        if (!runtime.httpClient || !runtime.session?.organizationId) {
          throw new ProviderNotFoundError();
        }

        const [signWith, typedData] = normalizedArgs.params as TypedDataRequestParams;
        const account = createAccountWithAddress({
          client: runtime.httpClient as never,
          organizationId: runtime.session.organizationId,
          signWith: getAddress(signWith),
          ethereumAddress: getAddress(signWith),
        });

        return account.signTypedData(parseTypedData(typedData) as never);
      }

      if (
        (normalizedArgs.method === "eth_sendTransaction" ||
          normalizedArgs.method === "eth_signTransaction") &&
        Array.isArray(normalizedArgs.params)
      ) {
        const [transaction, ...rest] = normalizedArgs.params as [TransactionRequestParam, ...unknown[]];
        const normalizedTransaction = normalizeTransactionRequestParam(transaction);
        const enrichedTransaction = { ...normalizedTransaction } as TransactionRequestParam;
        let preparedTransaction: TransactionRequestParam | undefined;

        if (enrichedTransaction.chainId === undefined) {
          try {
            const runtimeChainId = await provider.request({ method: "eth_chainId" } as never);
            const normalizedChainId = normalizeChainIdHex(runtimeChainId);
            if (normalizedChainId) {
              enrichedTransaction.chainId = normalizedChainId;
            }
          } catch {
            // Best-effort: some transports can't return chain id.
          }
        }

        if (enrichedTransaction.chainId !== undefined) {
          try {
            const activeChainId = await provider.request({ method: "eth_chainId" } as never);
            if (!sameChainId(activeChainId, enrichedTransaction.chainId)) {
              await provider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: enrichedTransaction.chainId }],
              } as never);
            }
          } catch {
            // Best-effort: some providers don't support switching.
          }
        }

        preparedTransaction = await prepareProviderTransactionRequest(
          provider,
          enrichedTransaction,
          resolveChain,
        );

        const requestArgs = {
          ...normalizedArgs,
          params: [preparedTransaction, ...rest],
        };

        pushDebugEntry("transaction-request", {
          method: normalizedArgs.method,
          transaction,
          enrichedTransaction,
          preparedTransaction,
        });

        if (normalizedArgs.method === "eth_signTransaction") {
          return await provider.request(requestArgs as never);
        }

        const queueKey = getTransactionQueueKey(preparedTransaction);
        if (!queueKey) {
          return await provider.request(requestArgs as never);
        }

        const previousSend = sendMutexByKey.get(queueKey) ?? Promise.resolve();
        let releaseSend!: () => void;
        const currentSend = previousSend
          .catch(() => undefined)
          .then(
            () =>
              new Promise<void>((resolve) => {
                releaseSend = resolve;
              }),
          );
        sendMutexByKey.set(queueKey, currentSend);

        await previousSend.catch(() => undefined);
        await pendingReceiptByKey.get(queueKey)?.catch(() => undefined);

        try {
          const hash: unknown = await provider.request(requestArgs as never);
          if (typeof hash === "string" && hash.startsWith("0x")) {
            const receiptWait = waitForTransactionReceipt(provider, hash as Hex).finally(() => {
              if (pendingReceiptByKey.get(queueKey) === receiptWait) {
                pendingReceiptByKey.delete(queueKey);
              }
            });
            pendingReceiptByKey.set(queueKey, receiptWait);
          }

          return hash;
        } catch (error) {
          pushDebugEntry("transaction-request-error", {
            method: normalizedArgs.method,
            transaction,
            enrichedTransaction,
            preparedTransaction,
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : String(error),
          });
          throw error;
        } finally {
          releaseSend();
          if (sendMutexByKey.get(queueKey) === currentSend) {
            sendMutexByKey.delete(queueKey);
          }
        }
      }

      return provider.request(normalizedArgs as never);
    },
  } as TurnkeyConnectorProvider;
}

export function createTurnkeyConnector({
  chains,
  walletLabel = "Turnkey Embedded Wallet",
  icon,
}: CreateTurnkeyConnectorOptions): CreateConnectorFn<TurnkeyConnectorProvider> {
  const providerCache: ProviderCache = {
    providerChainIds: new Set(),
  };
  const dynamicChains = new Map<number, Chain>();
  let currentChainId = chains[0].id;

  const getResolvedChains = () => [
    ...chains,
    ...dynamicChains.values(),
  ] as readonly ConnectorChain[];
  const resolveChain = (chainId: unknown) => findConfiguredChain(getResolvedChains(), chainId);

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
        findConfiguredChain(getResolvedChains(), chainId ?? currentChainId) ??
        configuredChains[0];

      const provider = await getOrCreateProvider(getResolvedChains(), nextChain, providerCache, resolveChain);
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
        findConfiguredChain(getResolvedChains(), chainId ?? currentChainId) ??
        configuredChains[0];
      currentChainId = chain.id;
      return getOrCreateProvider(getResolvedChains(), chain, providerCache, resolveChain);
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
    async switchChain({ chainId, addEthereumChainParameter }) {
      let chain = findConfiguredChain(getResolvedChains(), chainId);
      if (!chain) {
        const dynamicChain = buildDynamicChain(chainId, addEthereumChainParameter);
        if (dynamicChain) {
          dynamicChains.set(dynamicChain.id, dynamicChain);
          chain = dynamicChain;
        }
      }

      if (!chain) {
        throw new SwitchChainNotSupportedError({
          connector: {
            id: DEFAULT_ID,
            name: walletLabel,
            type: "turnkey",
          } as never,
        });
      }

      await getOrCreateProvider(getResolvedChains(), chain, providerCache, resolveChain);
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
