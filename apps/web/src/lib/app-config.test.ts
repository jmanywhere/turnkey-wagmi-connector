import { beforeEach, describe, expect, it, vi } from "vitest";

function makeNetwork(id: number, name: string) {
  return {
    id,
    name,
    rpcUrls: {
      default: {
        http: [`https://fallback-${id}.invalid`],
      },
      public: {
        http: [`https://public-${id}.invalid`],
      },
    },
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    blockExplorers: {
      default: {
        name,
        url: `https://explorer-${id}.invalid`,
      },
    },
  };
}

const mocks = vi.hoisted(() => ({
  createTurnkeyConnectorMock: vi.fn(() => ({ id: "turnkey" })),
  httpMock: vi.fn((url: string) => ({ url })),
}));

vi.mock("@reown/appkit/react", () => ({
  AppKitProvider: () => null,
}));

vi.mock("@reown/appkit/networks", () => ({
  mainnet: makeNetwork(1, "Mainnet"),
  base: makeNetwork(8453, "Base"),
  arbitrum: makeNetwork(42161, "Arbitrum"),
  optimism: makeNetwork(10, "Optimism"),
  polygon: makeNetwork(137, "Polygon"),
  baseSepolia: makeNetwork(84532, "Base Sepolia"),
}));

vi.mock("@reown/appkit-adapter-wagmi", () => ({
  WagmiAdapter: class {
    wagmiConfig: Record<string, unknown>;

    constructor({ networks }: { networks: unknown[] }) {
      this.wagmiConfig = { chains: networks };
    }
  },
}));

vi.mock("wagmi", () => ({
  http: mocks.httpMock,
}));

vi.mock("turnkey-wagmi-connector", () => ({
  createTurnkeyConnector: mocks.createTurnkeyConnectorMock,
}));

vi.mock("./env", () => ({
  publicEnv: {
    turnkeyOrganizationId: "",
    turnkeyAuthProxyConfigId: "",
    turnkeyApiBaseUrl: "https://api.turnkey.com",
    reownProjectId: "project-id",
    mainnetRpcUrl: "https://mainnet.example",
    baseRpcUrl: "https://base.example",
    arbitrumRpcUrl: "https://arbitrum.example",
    optimismRpcUrl: "https://optimism.example",
    polygonRpcUrl: "https://polygon.example",
    baseSepoliaRpcUrl: "https://base-sepolia.example",
  },
}));

describe("web app config", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createTurnkeyConnectorMock.mockClear();
    mocks.httpMock.mockClear();
  });

  it("passes env-backed RPC URLs into the Turnkey connector chains", async () => {
    await import("./app-config");

    expect(mocks.createTurnkeyConnectorMock).toHaveBeenCalledTimes(1);

    const firstCall = mocks.createTurnkeyConnectorMock.mock.calls[0];
    if (!firstCall) {
      throw new Error("createTurnkeyConnector was not called");
    }

    const options = (firstCall as unknown[])[0] as {
      chains: Array<{ rpcUrls: { default: { http: string[] } } }>;
    };

    expect(options.chains.map((chain) => chain.rpcUrls.default.http[0])).toEqual([
      "https://mainnet.example",
      "https://base.example",
      "https://arbitrum.example",
      "https://optimism.example",
      "https://polygon.example",
      "https://base-sepolia.example",
    ]);
  });
});
