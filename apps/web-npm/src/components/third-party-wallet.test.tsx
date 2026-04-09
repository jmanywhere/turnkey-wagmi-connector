/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SandboxDemo } from "./sandbox-demo";
import { SharedRuntime } from "./shared-runtime";
import { WidgetDemo } from "./widget-demo";

const mocks = vi.hoisted(() => ({
  sessionGate: {} as any,
}));

vi.mock("@reown/appkit/react", () => ({
  AppKitAccountButton: () => <button type="button">Account</button>,
  AppKitConnectButton: () => <button type="button">Connect Wallet</button>,
  AppKitNetworkButton: () => <button type="button">Network</button>,
}));

vi.mock("@lifi/widget", () => ({
  LiFiWidget: ({ integrator }: { integrator: string }) => (
    <div data-testid="lifi-widget">{integrator}</div>
  ),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
  }),
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
  useTurnkeySessionGate: () => mocks.sessionGate,
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
  useSwitchChain: () => ({
    switchChainAsync: vi.fn(async () => undefined),
  }),
  useSendTransaction: () => ({
    sendTransactionAsync: vi.fn(async () => "0xabc"),
    isPending: false,
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/copy-button", () => ({
  CopyButton: () => null,
}));

vi.mock("@/components/copy-block", () => ({
  CopyBlock: () => null,
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => null,
}));

describe("third-party wallet fallback", () => {
  beforeEach(() => {
    mocks.sessionGate = {
      authState: "unauthenticated",
      reconnectRequired: false,
      connectorError: undefined,
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
    } as any;
  });

  it("keeps shared runtime controls available while Turnkey is logged out", () => {
    render(<SharedRuntime />);

    expect(
      screen.getByText(/the active wagmi wallet remains connected/i),
    ).toBeInTheDocument();
    expect(screen.getByText("external wallet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Network" })).toBeInTheDocument();
  });

  it("still mounts the lifi widget for an external wallet without a Turnkey session", () => {
    render(<WidgetDemo />);

    expect(screen.getByTestId("lifi-widget")).toBeInTheDocument();
  });

  it("shows sandbox wagmi sign controls while Turnkey is logged out", () => {
    render(<SandboxDemo />);

    expect(
      screen.getByText(/turnkey is logged out\. the current wagmi wallet should stay connected/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign via Wagmi" })).toBeEnabled();
  });

  it("shows a connector warning without claiming the Turnkey session expired", () => {
    mocks.sessionGate = {
      ...mocks.sessionGate,
      authState: "authenticated",
      isSessionValid: true,
      connectorError: "Failed to fetch chain id",
      embeddedAccount: {
        address: "0x1234567890abcdef1234567890abcdef12345678",
      },
    } as any;

    render(<SharedRuntime />);

    expect(
      screen.getByText(/turnkey connector could not finish connecting/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/turnkey session is unavailable/i),
    ).not.toBeInTheDocument();
  });
});
