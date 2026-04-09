import { beforeEach, describe, expect, it, vi } from "vitest";

type MockConnection = {
  connector: {
    id: string;
    disconnect: ReturnType<typeof vi.fn>;
  };
};

const mocks = vi.hoisted(() => {
  let connectionsState: MockConnection[] = [];
  const connectMock = vi.fn();
  const disconnectMock = vi.fn(
    async (_config: unknown, { connector }: { connector: MockConnection["connector"] }) => {
      connectionsState = connectionsState.filter((item) => item.connector !== connector);
    },
  );
  const getConnectionsMock = vi.fn(() => connectionsState);
  const getConnectorsMock = vi.fn(() => []);
  const setActiveConnectorIdMock = vi.fn();
  const setConnectorErrorMock = vi.fn();
  const clearConnectorErrorMock = vi.fn();

  return {
    get connectionsState() {
      return connectionsState;
    },
    set connectionsState(value: MockConnection[]) {
      connectionsState = value;
    },
    connectMock,
    disconnectMock,
    getConnectionsMock,
    getConnectorsMock,
    setActiveConnectorIdMock,
    setConnectorErrorMock,
    clearConnectorErrorMock,
  };
});

vi.mock("@wagmi/core", () => ({
  connect: mocks.connectMock,
  disconnect: mocks.disconnectMock,
  getConnections: mocks.getConnectionsMock,
  getConnectors: mocks.getConnectorsMock,
}));

vi.mock("wagmi", () => ({
  useConfig: vi.fn(),
  useConnections: vi.fn(() => []),
}));

vi.mock("@turnkey/react-wallet-kit", () => ({
  AuthState: {
    Authenticated: "authenticated",
    Unauthenticated: "unauthenticated",
  },
  useTurnkey: vi.fn(),
}));

vi.mock("../provider/runtime-store", () => ({
  setActiveConnectorId: mocks.setActiveConnectorIdMock,
  setConnectorError: mocks.setConnectorErrorMock,
  clearConnectorError: mocks.clearConnectorErrorMock,
  setReconnectRequired: vi.fn(),
}));

vi.mock("../hooks/use-turnkey-session-gate", () => ({
  useTurnkeySessionGate: vi.fn(),
}));

import {
  disconnectAllConnections,
  disconnectTurnkeyConnections,
} from "./turnkey-wagmi-bridge";

describe("disconnectAllConnections", () => {
  beforeEach(() => {
    mocks.connectionsState = [];
    mocks.connectMock.mockReset();
    mocks.disconnectMock.mockReset();
    mocks.disconnectMock.mockImplementation(async (_config, { connector }) => {
      mocks.connectionsState = mocks.connectionsState.filter((item) => item.connector !== connector);
    });
    mocks.getConnectionsMock.mockClear();
    mocks.getConnectorsMock.mockClear();
    mocks.setActiveConnectorIdMock.mockReset();
    mocks.setConnectorErrorMock.mockReset();
    mocks.clearConnectorErrorMock.mockReset();
  });

  it("disconnects every active connection through Wagmi actions", async () => {
    const first = { id: "first", disconnect: vi.fn(async () => undefined) };
    const second = { id: "second", disconnect: vi.fn(async () => undefined) };
    mocks.connectionsState = [{ connector: first }, { connector: second }];

    await disconnectAllConnections({} as never);

    expect(mocks.disconnectMock).toHaveBeenCalledTimes(2);
    expect(mocks.disconnectMock).toHaveBeenNthCalledWith(1, {}, { connector: first });
    expect(mocks.disconnectMock).toHaveBeenNthCalledWith(2, {}, { connector: second });
    expect(mocks.setActiveConnectorIdMock).toHaveBeenCalledWith(undefined);
  });

  it("falls back to connector.disconnect when Wagmi disconnect throws", async () => {
    const first = { id: "first", disconnect: vi.fn(async () => undefined) };
    mocks.connectionsState = [{ connector: first }];
    mocks.disconnectMock.mockRejectedValueOnce(new Error("disconnect failed"));

    await disconnectAllConnections({} as never);

    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.setActiveConnectorIdMock).toHaveBeenCalledWith(undefined);
  });
});

describe("disconnectTurnkeyConnections", () => {
  beforeEach(() => {
    mocks.connectionsState = [];
    mocks.connectMock.mockReset();
    mocks.disconnectMock.mockReset();
    mocks.disconnectMock.mockImplementation(async (_config, { connector }) => {
      mocks.connectionsState = mocks.connectionsState.filter((item) => item.connector !== connector);
    });
    mocks.getConnectionsMock.mockClear();
    mocks.getConnectorsMock.mockClear();
    mocks.setActiveConnectorIdMock.mockReset();
    mocks.setConnectorErrorMock.mockReset();
    mocks.clearConnectorErrorMock.mockReset();
  });

  it("disconnects only the Turnkey connector and preserves external wallets", async () => {
    const turnkey = { id: "turnkey", disconnect: vi.fn(async () => undefined) };
    const external = { id: "injected", disconnect: vi.fn(async () => undefined) };
    mocks.connectionsState = [{ connector: turnkey }, { connector: external }];

    await disconnectTurnkeyConnections({} as never, "turnkey");

    expect(mocks.disconnectMock).toHaveBeenCalledTimes(1);
    expect(mocks.disconnectMock).toHaveBeenCalledWith({}, { connector: turnkey });
    expect(mocks.connectionsState).toEqual([{ connector: external }]);
    expect(mocks.setActiveConnectorIdMock).toHaveBeenCalledWith("injected");
  });

  it("leaves external-only connections untouched", async () => {
    const external = { id: "walletConnect", disconnect: vi.fn(async () => undefined) };
    mocks.connectionsState = [{ connector: external }];

    await disconnectTurnkeyConnections({} as never, "turnkey");

    expect(mocks.disconnectMock).not.toHaveBeenCalled();
    expect(mocks.connectionsState).toEqual([{ connector: external }]);
    expect(mocks.setActiveConnectorIdMock).toHaveBeenCalledWith("walletConnect");
  });
});
