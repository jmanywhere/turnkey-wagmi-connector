"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AppKitAccountButton,
  AppKitConnectButton,
  AppKitNetworkButton,
  useAppKitAccount,
  useDisconnect,
} from "@reown/appkit/react";
import { LiFiWidget } from "@lifi/widget";
import {
  useAccount,
  useBalance,
  useChainId,
  useConnections,
  useSignMessage,
} from "wagmi";
import { formatUnits } from "viem";
import {
  useTurnkeyChainSwitch,
  useTurnkeySessionGate,
} from "turnkey-wagmi-connector";
import { isReownConfigured, isTurnkeyConfigured } from "@/lib/env";
import { appKitNetworks, widgetSwitchTargets } from "@/lib/network-config";
import { wagmiConfig } from "@/lib/widget-app-config";

export function Wagmi3WidgetDemo() {
  const sessionGate = useTurnkeySessionGate();
  const { switchChain } = useTurnkeyChainSwitch(wagmiConfig);
  const connections = useConnections();
  const account = useAccount();
  const appKitAccount = useAppKitAccount();
  const { disconnect: disconnectAppKit } = useDisconnect();
  const chainId = useChainId();
  const { data: balance, error: balanceError } = useBalance({
    address: account.address,
    chainId: account.chainId ?? chainId,
    query: {
      enabled: account.isConnected && Boolean(account.address),
    },
  });
  const { signMessageAsync } = useSignMessage();
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");

  const connectedAddress =
    sessionGate.isSessionValid && account.isConnected
      ? account.address
      : undefined;
  const lifiWidgetKey = `${connectedAddress ?? "disconnected"}:${String(
    sessionGate.isSessionValid,
  )}`;
  const sessionExpiryLabel = sessionGate.sessionExpiresAt
    ? new Date(sessionGate.sessionExpiresAt).toLocaleString()
    : "n/a";

  useEffect(() => {
    if (connectedAddress) {
      return;
    }

    if (!appKitAccount.isConnected && !appKitAccount.address) {
      return;
    }

    void disconnectAppKit().catch(() => undefined);
  }, [
    appKitAccount.address,
    appKitAccount.isConnected,
    connectedAddress,
    disconnectAppKit,
  ]);

  const activeConnector = connections[0]?.connector;
  const issues = useMemo(() => {
    const items: string[] = [];

    if (!isTurnkeyConfigured) {
      items.push(
        "Turnkey env vars are missing. Embedded auth cannot complete yet.",
      );
    }

    if (!isReownConfigured) {
      items.push(
        "Reown project ID is missing. External wallet switching will stay disabled.",
      );
    }

    if (!appKitNetworks.every((chain) => chain.rpcUrls.default.http[0])) {
      items.push("At least one configured chain is missing a concrete RPC URL.");
    }

    return items;
  }, []);

  return (
    <div className="route-layout stack">
      <header className="route-header">
        <div className="stack">
          <p className="eyebrow">Wagmi 3 Acceptance Demo</p>
          <h1>LI.FI widget recognition with Turnkey session gating.</h1>
          <p className="text-muted">
            This route keeps the same comparison shape as the Wagmi 2 demo, but
            runs it on the Wagmi 3 fixture. Turnkey controls session validity,
            Reown/AppKit can swap the active wallet, and LI.FI should reuse the
            selected Wagmi connection inside the shared provider tree.
          </p>
        </div>
        <div className="button-row">
          <Link href="/" className="secondary-link">
            Back to pure fixture
          </Link>
        </div>
      </header>

      {issues.map((issue) => (
        <div className="session-banner" key={issue}>
          {issue}
        </div>
      ))}

      {sessionGate.authState === "unauthenticated" && account.isConnected ? (
        <div className="session-banner">
          Turnkey is unauthenticated. If the session bridge is working, all
          active Wagmi connectors should be forced to disconnect.
        </div>
      ) : null}

      {sessionGate.reconnectRequired ? (
        <div className="session-banner">
          Turnkey session is no longer valid. Wagmi and LI.FI should
          auto-disconnect until you reconnect.
          {sessionGate.lastError ? ` Reason: ${sessionGate.lastError}` : ""}
        </div>
      ) : null}

      <section className="dashboard-grid">
        <article className="panel dashboard-panel stack">
          <div className="button-row">
            <button
              className="action-button primary"
              onClick={() => void sessionGate.connectTurnkey()}
              type="button"
            >
              Connect Turnkey session
            </button>
            <button
              className="action-button secondary"
              onClick={() => void sessionGate.refreshSession()}
              type="button"
            >
              Refresh session
            </button>
            <button
              className="action-button secondary"
              onClick={() => void sessionGate.disconnectAll()}
              type="button"
            >
              Disconnect all
            </button>
          </div>

          <div className="button-row">
            <AppKitConnectButton />
            {connectedAddress ? (
              <>
                <AppKitAccountButton />
                <AppKitNetworkButton />
              </>
            ) : (
              <>
                <button
                  className="action-button secondary"
                  disabled
                  type="button"
                >
                  Disconnected
                </button>
                <button
                  className="action-button secondary"
                  disabled
                  type="button"
                >
                  No network
                </button>
              </>
            )}
          </div>

          <div className="button-row">
            {widgetSwitchTargets.map((chain) => (
              <button
                key={chain.id}
                className="action-button secondary"
                disabled={account.chainId === chain.id}
                onClick={() => {
                  void switchChain(chain.id)
                    .then(() => setError(""))
                    .catch((cause) => {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "Chain switch failed.",
                      );
                    });
                }}
                type="button"
              >
                Switch to {chain.label}
              </button>
            ))}
          </div>

          <div className="status-grid">
            <div className="status-card">
              <span className="status-label">Wagmi status</span>
              <div className="status-value">
                {account.isConnected ? "connected" : "disconnected"}
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">Auth state</span>
              <div className="status-value">{sessionGate.authState}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Active connector</span>
              <div className="status-value">
                {activeConnector?.name ?? "none"}
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">Embedded address</span>
              <div className="status-value">
                {sessionGate.embeddedAccount?.address ?? "not resolved"}
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">Selected address</span>
              <div className="status-value">
                {account.address ?? "not connected"}
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">Current chain</span>
              <div className="status-value">{chainId || "n/a"}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Session valid</span>
              <div className="status-value">
                {sessionGate.isSessionValid ? "yes" : "no"}
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">Expires at</span>
              <div className="status-value">{sessionExpiryLabel}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Expires in</span>
              <div className="status-value">
                {sessionGate.sessionSecondsRemaining !== undefined
                  ? `${sessionGate.sessionSecondsRemaining}s`
                  : "n/a"}
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">Balance</span>
              <div className="status-value">
                {balance
                  ? `${formatUnits(balance.value, balance.decimals)} ${balance.symbol}`
                  : "n/a"}
              </div>
            </div>
          </div>

          {balanceError ? (
            <div className="session-banner">
              Native balance fetch failed: {balanceError.message}
            </div>
          ) : null}

          <div className="stack">
            <h2>Wagmi signer smoke test</h2>
            <p>
              This signs a simple message through the currently selected Wagmi
              connector. If the Turnkey connector is active, the signature
              should come from the embedded wallet. If an external wallet is
              active, the same Wagmi action should follow that connector
              instead.
            </p>
            <div className="button-row">
              <button
                className="action-button primary"
                disabled={!account.isConnected}
                onClick={async () => {
                  try {
                    setError("");
                    const result = await signMessageAsync({
                      message: `Turnkey widget demo :: ${new Date().toISOString()}`,
                    });
                    setSignature(result);
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : "Signing failed.",
                    );
                  }
                }}
                type="button"
              >
                Sign via Wagmi
              </button>
            </div>
            {signature ? <pre className="mono-box">{signature}</pre> : null}
            {error ? <div className="session-banner">{error}</div> : null}
          </div>
        </article>

        <article className="panel dashboard-panel widget-shell stack">
          <p className="eyebrow">LI.FI Widget</p>
          <h2>Connected through the surrounding WagmiProvider</h2>
          <p>
            The widget lives in the same provider tree. If this route is
            working correctly, LI.FI should treat the selected Wagmi wallet as
            already connected.
          </p>
          {connectedAddress ? (
            <LiFiWidget
              key={lifiWidgetKey}
              integrator="vudy-app"
              config={{
                appearance: "light",
                variant: "wide",
                theme: {
                  palette: {
                    primary: { main: "#19140f" },
                    secondary: { main: "#c25a2d" },
                    background: {
                      default: "#fff7ee",
                      paper: "#fffdf9",
                    },
                    text: {
                      primary: "#19140f",
                      secondary: "#6a5d4d",
                    },
                  },
                  shape: {
                    borderRadius: 18,
                    borderRadiusSecondary: 18,
                  },
                },
              }}
            />
          ) : (
            <div className="session-banner">
              Connect a valid wallet session to enable LI.FI route fetching.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
