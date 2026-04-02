import { beforeEach, describe, expect, it, vi } from "vitest";
import { numberToHex } from "viem";

vi.mock("@turnkey/react-wallet-kit", () => ({
  AuthState: {
    Unauthenticated: "unauthenticated",
  },
}));

vi.mock("viem/actions", async () => {
  const actual = await vi.importActual<typeof import("viem/actions")>("viem/actions");

  return {
    ...actual,
    prepareTransactionRequest: vi.fn(async (_client, args: Record<string, unknown>) => {
      const parameters = new Set(
        ((args.parameters as readonly string[] | undefined) ?? [
          "blobVersionedHashes",
          "chainId",
          "fees",
          "gas",
          "nonce",
          "type",
        ]) as readonly string[],
      );
      const nextArgs = { ...args };

      if (parameters.has("chainId") && nextArgs.chainId === undefined) {
        nextArgs.chainId = 10;
      }

      if (parameters.has("gas") && nextArgs.gas === undefined) {
        nextArgs.gas = 21_000n;
      }

      if (parameters.has("fees")) {
        if (
          nextArgs.gasPrice === undefined &&
          nextArgs.maxFeePerGas === undefined &&
          nextArgs.maxPriorityFeePerGas === undefined
        ) {
          nextArgs.maxFeePerGas = 5n;
          nextArgs.maxPriorityFeePerGas = 1n;
        }
      }

      if (parameters.has("nonce") && nextArgs.nonce === undefined) {
        nextArgs.nonce = 7;
      }

      if (parameters.has("type") && nextArgs.type === undefined) {
        nextArgs.type = nextArgs.gasPrice === undefined ? "eip1559" : "legacy";
      }

      return nextArgs;
    }),
  };
});

import { prepareTransactionRequest as viemPrepareTransactionRequest } from "viem/actions";
import {
  mergePreparedTransactionRequest,
  normalizeTransactionRequestParam,
  prepareProviderTransactionRequest,
} from "./create-turnkey-connector";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normalizeTransactionRequestParam", () => {
  it("normalizes symbolic EIP-1559 transaction types", () => {
    expect(
      normalizeTransactionRequestParam({
        chainId: 42161,
        type: "eip1559",
      }),
    ).toMatchObject({
      chainId: "0xa4b1",
      type: "0x2",
    });
  });

  it("maps gasLimit to gas and normalizes Arbitrum decimal chain id", () => {
    expect(
      normalizeTransactionRequestParam({
        chainId: "42161",
        gasLimit: "21000",
        value: "3",
      }),
    ).toMatchObject({
      chainId: "0xa4b1",
      gas: "0x5208",
      value: "0x3",
    });
  });

  it("forces legacy type when gasPrice is provided with eip1559 type", () => {
    expect(
      normalizeTransactionRequestParam({
        chainId: 42161,
        gasPrice: "9",
        type: "eip1559",
      }),
    ).toMatchObject({
      chainId: "0xa4b1",
      gasPrice: "0x9",
      type: "0x0",
    });
  });

  it("drops gasPrice when both legacy and eip1559 fees are provided", () => {
    expect(
      normalizeTransactionRequestParam({
        chainId: 42161,
        gasPrice: "9",
        maxFeePerGas: "5",
        maxPriorityFeePerGas: "1",
      }),
    ).toMatchObject({
      chainId: "0xa4b1",
      maxFeePerGas: "0x5",
      maxPriorityFeePerGas: "0x1",
      type: "0x2",
    });
  });
});

describe("mergePreparedTransactionRequest", () => {
  it("prefers prepared fees over upstream and drops wildly inflated upstream gas", () => {
    const merged = mergePreparedTransactionRequest(
      normalizeTransactionRequestParam({
        from: "0x0000000000000000000000000000000000000001",
        to: "0x0000000000000000000000000000000000000002",
        chainId: 42161,
        gas: numberToHex(600_000n),
        maxFeePerGas: numberToHex(100_000_000_000n),
      }),
      normalizeTransactionRequestParam({
        from: "0x0000000000000000000000000000000000000001",
        to: "0x0000000000000000000000000000000000000002",
        chainId: 42161,
        gas: numberToHex(80_000n),
        maxFeePerGas: "0x5",
        maxPriorityFeePerGas: "0x1",
        type: "0x2",
      }),
    );

    expect(merged.gas).toBe(numberToHex(104_000n));
    expect(merged.maxFeePerGas).toBe("0x5");
  });

  it("uses the higher gas when upstream is only moderately above prepared", () => {
    const merged = mergePreparedTransactionRequest(
      normalizeTransactionRequestParam({
        from: "0x0000000000000000000000000000000000000001",
        chainId: 42161,
        gas: numberToHex(150_000n),
      }),
      normalizeTransactionRequestParam({
        from: "0x0000000000000000000000000000000000000001",
        chainId: 42161,
        gas: numberToHex(100_000n),
        maxFeePerGas: "0x5",
        type: "0x2",
      }),
    );

    expect(merged.gas).toBe(numberToHex(150_000n));
  });
});

describe("prepareProviderTransactionRequest", () => {
  it("only fills missing fields when the upstream request already includes gas pricing", async () => {
    const provider = {
      request: vi.fn(),
    };
    const chain = {
      id: 42161,
      name: "Arbitrum One",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://example-rpc.invalid"] } },
    };

    const transaction = await prepareProviderTransactionRequest(
      provider as never,
      {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x0000000000000000000000000000000000000002",
        value: "0x3",
        gas: "0x5208",
        gasPrice: "0x9",
        chainId: "0xa4b1",
      },
      () => chain as never,
    );

    expect(vi.mocked(viemPrepareTransactionRequest).mock.calls[0]?.[1]).toMatchObject({
      chain,
      chainId: 42161,
      gasPrice: 9n,
      parameters: ["blobVersionedHashes", "chainId", "nonce", "type", "gas"],
      type: "legacy",
    });
    expect(transaction).toEqual({
      to: "0x0000000000000000000000000000000000000002",
      value: "0x3",
      chainId: "0xa4b1",
      gas: "0x5208",
      gasPrice: "0x9",
      nonce: "0x7",
      type: "0x0",
    });
  });

  it("prepares the transaction through viem and normalizes the result", async () => {
    const provider = {
      request: vi.fn(),
    };
    const chain = {
      id: 10,
      name: "OP Mainnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://example-rpc.invalid"] } },
    };

    const transaction = await prepareProviderTransactionRequest(
      provider as never,
      {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x0000000000000000000000000000000000000002",
        value: "0x3",
        chainId: "0xa",
      },
      () => chain as never,
    );

    expect(vi.mocked(viemPrepareTransactionRequest)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(viemPrepareTransactionRequest).mock.calls[0]?.[1]).toMatchObject({
      account: "0x0000000000000000000000000000000000000001",
      chain,
      chainId: 10,
      parameters: ["blobVersionedHashes", "chainId", "nonce", "type", "gas", "fees"],
      to: "0x0000000000000000000000000000000000000002",
      value: 3n,
    });
    expect(transaction).toEqual({
      to: "0x0000000000000000000000000000000000000002",
      value: "0x3",
      chainId: "0xa",
      gas: "0x5208",
      maxFeePerGas: "0x5",
      maxPriorityFeePerGas: "0x1",
      nonce: "0x7",
      type: "0x2",
    });
  });

  it("falls back to the provider chain id when the transaction omits one", async () => {
    const provider = {
      request: vi.fn(async (args: { method: string }) => {
        if (args.method === "eth_chainId") {
          return "0xa";
        }

        throw new Error(`Unexpected RPC method: ${args.method}`);
      }),
    };
    const resolveChain = vi.fn(() => undefined);

    await prepareProviderTransactionRequest(
      provider as never,
      {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x0000000000000000000000000000000000000002",
      },
      resolveChain,
    );

    expect(provider.request).toHaveBeenCalledWith({ method: "eth_chainId" });
    expect(resolveChain).toHaveBeenCalledWith("0xa");
  });

  it("preserves upstream gasLimit as gas during prepare", async () => {
    const provider = {
      request: vi.fn(),
    };
    const chain = {
      id: 42161,
      name: "Arbitrum One",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://example-rpc.invalid"] } },
    };

    const transaction = await prepareProviderTransactionRequest(
      provider as never,
      {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x0000000000000000000000000000000000000002",
        value: "0x3",
        gasLimit: "0x5300",
        chainId: "42161",
      },
      () => chain as never,
    );

    expect(vi.mocked(viemPrepareTransactionRequest).mock.calls[0]?.[1]).toMatchObject({
      chain,
      chainId: 42161,
      parameters: ["blobVersionedHashes", "chainId", "nonce", "type", "gas", "fees"],
      to: "0x0000000000000000000000000000000000000002",
      value: 3n,
    });
    expect(transaction).toEqual({
      to: "0x0000000000000000000000000000000000000002",
      value: "0x3",
      chainId: "0xa4b1",
      gas: "0x5300",
      maxFeePerGas: "0x5",
      maxPriorityFeePerGas: "0x1",
      nonce: "0x7",
      type: "0x2",
    });
  });
});
