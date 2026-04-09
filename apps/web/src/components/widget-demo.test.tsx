/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WidgetDemo } from "./widget-demo";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@lifi/widget", () => ({
  LiFiWidget: ({ integrator }: { integrator: string }) => (
    <div data-testid="lifi-widget">{integrator}</div>
  ),
}));

vi.mock("@reown/appkit/react", () => ({
  AppKitAccountButton: () => <button type="button">Account</button>,
  AppKitConnectButton: () => <button type="button">Connect Wallet</button>,
  AppKitNetworkButton: () => <button type="button">Network</button>,
}));

vi.mock("@/lib/app-config", () => ({
  wagmiConfig: {},
}));

vi.mock("@/lib/env", () => ({
  isReownConfigured: true,
  isTurnkeyConfigured: true,
}));

vi.mock("turnkey-wagmi-connector", () => ({
  useTurnkeyChainSwitch: () => ({
    switchChain: vi.fn(async () => undefined),
  }),
  useTurnkeySessionGate: () => ({
    authState: "unauthenticated",
    reconnectRequired: false,
    lastError: undefined,
    activeConnectorId: "injected",
    isSessionValid: false,
    sessionExpiresAt: undefined,
    sessionSecondsRemaining: undefined,
    connectTurnkey: vi.fn(async () => undefined),
    refreshSession: vi.fn(async () => undefined),
    disconnectAll: vi.fn(async () => undefined),
    lastEvent: undefined,
    lastEventAt: undefined,
    embeddedAccount: undefined,
  }),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chainId: 8453,
    isConnected: true,
  }),
  useBalance: () => ({
    data: { formatted: "1.23", symbol: "ETH" },
    error: null,
  }),
  useChainId: () => 8453,
  useConnections: () => [
    {
      connector: {
        id: "injected",
        name: "MetaMask",
      },
    },
  ],
  useSignMessage: () => ({
    signMessageAsync: vi.fn(async () => "0xsigned"),
  }),
}));

describe("WidgetDemo", () => {
  it("keeps an external wallet active when Turnkey has no session", () => {
    render(<WidgetDemo />);

    expect(
      screen.getByText(/the connected wagmi wallet remains usable/i),
    ).toBeInTheDocument();
    expect(screen.getByText("external wallet")).toBeInTheDocument();
    expect(screen.getByTestId("lifi-widget")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Sign via Wagmi",
      }),
    ).toBeEnabled();
  });
});
