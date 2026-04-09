/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const connectMock = vi.fn();
  const setActiveConnectorIdMock = vi.fn();
  const setReconnectRequiredMock = vi.fn();
  const setConnectorErrorMock = vi.fn();
  const clearConnectorErrorMock = vi.fn();
  const useConfigMock = vi.fn();
  const useConnectionsMock = vi.fn();
  const useTurnkeyMock = vi.fn();
  const useTurnkeySessionGateMock = vi.fn();
  const getConnectorsMock = vi.fn();

  return {
    connectMock,
    setActiveConnectorIdMock,
    setReconnectRequiredMock,
    setConnectorErrorMock,
    clearConnectorErrorMock,
    useConfigMock,
    useConnectionsMock,
    useTurnkeyMock,
    useTurnkeySessionGateMock,
    getConnectorsMock,
  };
});

vi.mock("@wagmi/core", () => ({
  connect: mocks.connectMock,
  disconnect: vi.fn(),
  getConnections: vi.fn(() => []),
  getConnectors: mocks.getConnectorsMock,
}));

vi.mock("wagmi", () => ({
  useConfig: mocks.useConfigMock,
  useConnections: mocks.useConnectionsMock,
}));

vi.mock("@turnkey/react-wallet-kit", () => ({
  AuthState: {
    Authenticated: "authenticated",
    Unauthenticated: "unauthenticated",
  },
  useTurnkey: mocks.useTurnkeyMock,
}));

vi.mock("../provider/runtime-store", () => ({
  setActiveConnectorId: mocks.setActiveConnectorIdMock,
  setReconnectRequired: mocks.setReconnectRequiredMock,
  setConnectorError: mocks.setConnectorErrorMock,
  clearConnectorError: mocks.clearConnectorErrorMock,
}));

vi.mock("../hooks/use-turnkey-session-gate", () => ({
  useTurnkeySessionGate: mocks.useTurnkeySessionGateMock,
}));

import { TurnkeyWagmiBridge } from "./turnkey-wagmi-bridge";

describe("TurnkeyWagmiBridge auto-connect behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useConfigMock.mockReturnValue({
      chains: [{ id: 8453 }],
    });
    mocks.useConnectionsMock.mockReturnValue([]);
    mocks.useTurnkeyMock.mockReturnValue({
      authState: "authenticated",
      session: { expiry: String(Math.floor(Date.now() / 1000) + 3600) },
      refreshSession: vi.fn(async () => undefined),
      logout: vi.fn(async () => undefined),
    });
    mocks.useTurnkeySessionGateMock.mockReturnValue({
      isSessionValid: true,
      embeddedAccount: {
        address: "0x1234567890abcdef1234567890abcdef12345678",
      },
      lastEvent: undefined,
    });
    mocks.getConnectorsMock.mockReturnValue([
      {
        id: "turnkey",
      },
    ]);
  });

  it("records connector bootstrap failures without flagging the session as invalid", async () => {
    mocks.connectMock.mockRejectedValueOnce(new Error("Failed to fetch chain id"));

    render(<TurnkeyWagmiBridge />);

    await waitFor(() => {
      expect(mocks.setConnectorErrorMock).toHaveBeenCalledWith("Failed to fetch chain id");
    });
    expect(mocks.setReconnectRequiredMock).not.toHaveBeenCalled();
  });

  it("clears stale connector errors after a successful auto-connect", async () => {
    mocks.connectMock.mockResolvedValueOnce(undefined);

    render(<TurnkeyWagmiBridge />);

    await waitFor(() => {
      expect(mocks.clearConnectorErrorMock).toHaveBeenCalled();
    });
    expect(mocks.setReconnectRequiredMock).toHaveBeenCalledWith(false);
    expect(mocks.setActiveConnectorIdMock).toHaveBeenCalledWith("turnkey");
  });
});
