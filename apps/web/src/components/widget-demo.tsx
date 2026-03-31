"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppKitAccountButton, AppKitConnectButton, AppKitNetworkButton } from "@reown/appkit/react";
import { LiFiWidget } from "@lifi/widget";
import {
  useAccount,
  useBalance,
  useChainId,
  useConnections,
  useSignMessage,
} from "wagmi";
import { useTurnkeySessionGate } from "turnkey-wagmi-connector";
import {
  isReownConfigured,
  isTurnkeyConfigured,
} from "@/lib/env";

export function WidgetDemo() {
  const sessionGate = useTurnkeySessionGate();
  const connections = useConnections();
  const account = useAccount();
  const chainId = useChainId();
  const { data: balance, error: balanceError } = useBalance({
    address: account.address,
    chainId: account.chainId ?? chainId,
    query: {
      enabled: account.isConnected && Boolean(account.address),
    },
  });
  const { signMessageAsync } = useSignMessage();
  const [signature, setSignature] = useState<string>("");
  const [error, setError] = useState<string>("");

  const activeConnector = connections[0]?.connector;
  const issues = useMemo(() => {
    const items: string[] = [];
    if (!isTurnkeyConfigured) {
      items.push("Turnkey env vars are missing. Embedded auth cannot complete yet.");
    }
    if (!isReownConfigured) {
      items.push("Reown project ID is missing. External wallet switching will stay disabled.");
    }
    return items;
  }, []);

  return (
    <div className="route-layout stack">
      <header className="route-header">
        <div className="stack">
          <p className="eyebrow">Acceptance Demo</p>
          <h1>LI.FI widget recognition with Turnkey session gating.</h1>
          <p className="text-muted">
            The Turnkey embedded wallet auto-connects into Wagmi after auth.
            Reown AppKit can replace it with an external wallet, but the
            Turnkey session still governs whether any wallet is allowed to stay
            connected.
          </p>
        </div>
        <div className="button-row">
          <Link href="/" className="secondary-link">
            Back home
          </Link>
          <Link href="/sandbox" className="secondary-link">
            Direct sandbox
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
            <AppKitAccountButton />
            <AppKitNetworkButton />
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
              <span className="status-label">Balance</span>
              <div className="status-value">
                {balance ? `${balance.formatted} ${balance.symbol}` : "n/a"}
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
          <LiFiWidget
            integrator="turnkey-wagmi-connector-demo"
            config={{
              appearance: "light",
              variant: "wide",
              subvariant: "split",
              fromChain: 8453,
              toChain: 10,
              theme: {
                palette: {
                  primary: { main: "#19140f" },
                  secondary: { main: "#c25a2d" },
                  background: { default: "#fff7ee", paper: "#fffdf9" },
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
        </article>
      </section>
    </div>
  );
}
