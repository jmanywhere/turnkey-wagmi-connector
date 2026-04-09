"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatUnits, parseEther } from "viem";
import {
  useAccount,
  useBalance,
  useChainId,
  useConnections,
  useSignMessage,
} from "wagmi";
import {
  useTurnkeyChainSwitch,
  useTurnkeySessionGate,
  useTurnkeyWalletActions,
} from "turnkey-wagmi-connector";
import { appChains, wagmiConfig } from "@/lib/plain-app-config";
import { isTurnkeyConfigured } from "@/lib/env";
import { plainSwitchTargets } from "@/lib/network-config";

export function Wagmi3Demo() {
  const sessionGate = useTurnkeySessionGate();
  const { switchChain } = useTurnkeyChainSwitch(wagmiConfig);
  const turnkeyActions = useTurnkeyWalletActions();
  const { signMessageAsync } = useSignMessage();
  const account = useAccount();
  const connections = useConnections();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address: account.address,
    chainId: account.chainId ?? chainId,
    query: {
      enabled: account.isConnected && Boolean(account.address),
    },
  });
  const [wagmiSignature, setWagmiSignature] = useState("");
  const [directSignature, setDirectSignature] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [amount, setAmount] = useState("0.00001");
  const [error, setError] = useState("");

  const selectedAddress = account.address ?? turnkeyActions.address;
  const activeConnector = connections[0]?.connector;
  const sessionExpiryLabel = sessionGate.sessionExpiresAt
    ? new Date(sessionGate.sessionExpiresAt).toLocaleString()
    : "n/a";
  const chainSummary = useMemo(
    () => appChains.map((chain) => `${chain.name} (${chain.id})`).join(", "),
    [],
  );
  const typedDataPayload = useMemo(
    () => ({
      domain: {
        name: "Turnkey Wagmi v3 Demo",
        version: "1",
        chainId: turnkeyActions.chainId ?? chainId,
      },
      primaryType: "Wagmi3Message" as const,
      types: {
        Wagmi3Message: [
          { name: "purpose", type: "string" },
          { name: "timestamp", type: "string" },
        ],
      },
      message: {
        purpose: "Validate direct Turnkey typed-data signing under Wagmi 3",
        timestamp: new Date().toISOString(),
      },
    }),
    [chainId, turnkeyActions.chainId],
  );
  const issues = useMemo(() => {
    const items: string[] = [];
    if (!isTurnkeyConfigured) {
      items.push("Turnkey env vars are missing. Email OTP auth cannot complete yet.");
    }
    if (!appChains.every((chain) => chain.rpcUrls.default.http[0])) {
      items.push("At least one configured chain is missing a concrete RPC URL.");
    }
    return items;
  }, []);

  return (
    <main className="route-layout stack">
      <header className="route-header">
        <div className="stack">
          <p className="eyebrow">Pure Wagmi 3 Fixture</p>
          <h1>Turnkey session authority on top of a plain Wagmi 3 app.</h1>
          <p className="text-muted">
            This fixture removes Reown/AppKit and LI.FI so the connector can be
            validated against the latest Wagmi stack in isolation. The active
            Wagmi connection still lives or dies with the Turnkey session.
          </p>
        </div>
        <div className="button-row">
          <Link className="secondary-link" href="/widget">
            Open Reown + LI.FI comparison
          </Link>
        </div>
      </header>

      {issues.map((issue) => (
        <div className="session-banner" key={issue}>
          {issue}
        </div>
      ))}

      {sessionGate.reconnectRequired ? (
        <div className="session-banner">
          Turnkey session is unavailable. Reconnect before sending more
          Wagmi or direct Turnkey actions.
          {sessionGate.lastError ? ` Reason: ${sessionGate.lastError}` : ""}
        </div>
      ) : null}

      {sessionGate.connectorError ? (
        <div className="session-banner">
          Turnkey connector could not finish connecting. The Turnkey session is
          still active, but RPC-backed connector actions stay paused until the
          transport recovers or you reconnect.
          {` Reason: ${sessionGate.connectorError}`}
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
            {plainSwitchTargets.map((target) => (
              <button
                key={target.id}
                className="action-button secondary"
                disabled={chainId === target.id}
                onClick={() => {
                  void switchChain(target.id)
                    .then(() => setError(""))
                    .catch((cause) => {
                      setError(cause instanceof Error ? cause.message : "Chain switch failed.");
                    });
                }}
                type="button"
              >
                Switch to {target.label}
              </button>
            ))}
          </div>

          <div className="status-grid">
            <div className="status-card">
              <span className="status-label">Wagmi status</span>
              <div className="status-value">{account.isConnected ? "connected" : "disconnected"}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Auth state</span>
              <div className="status-value">{sessionGate.authState}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Active connector</span>
              <div className="status-value">{activeConnector?.name ?? "none"}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Current chain</span>
              <div className="status-value">{chainId || "n/a"}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Embedded address</span>
              <div className="status-value">{sessionGate.embeddedAccount?.address ?? "not resolved"}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Selected address</span>
              <div className="status-value">{selectedAddress ?? "not connected"}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Session valid</span>
              <div className="status-value">{sessionGate.isSessionValid ? "yes" : "no"}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Session expiry</span>
              <div className="status-value">{sessionExpiryLabel}</div>
            </div>
            <div className="status-card">
              <span className="status-label">Balance</span>
              <div className="status-value">
                {balance
                  ? `${formatUnits(balance.value, balance.decimals)} ${balance.symbol}`
                  : "unavailable"}
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">Configured chains</span>
              <div className="status-value">{chainSummary}</div>
            </div>
          </div>
        </article>

        <article className="panel dashboard-panel stack">
          <p className="eyebrow">Wagmi Path</p>
          <h2>Normal Wagmi signing through the active connector</h2>
          <p className="text-muted">
            This uses `useSignMessage()` so the request travels through the
            active Wagmi connector instead of the direct Turnkey helpers.
          </p>
          <div className="button-row">
            <button
              className="action-button primary"
              disabled={!account.isConnected}
              onClick={async () => {
                try {
                  setError("");
                  const signature = await signMessageAsync({
                    message: `Wagmi 3 message :: ${new Date().toISOString()}`,
                  });
                  setWagmiSignature(signature);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Wagmi signing failed.");
                }
              }}
              type="button"
            >
              Sign via Wagmi
            </button>
          </div>
          {wagmiSignature ? <pre className="mono-box">{wagmiSignature}</pre> : null}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-panel stack">
          <p className="eyebrow">Direct Turnkey Actions</p>
          <h2>Bypass provider RPC with `@turnkey/viem`</h2>
          <div className="button-row">
            <button
              className="action-button primary"
              disabled={!turnkeyActions.address}
              onClick={async () => {
                try {
                  setError("");
                  const signature = await turnkeyActions.signMessage({
                    message: `Direct Turnkey sign :: ${new Date().toISOString()}`,
                  });
                  setDirectSignature(signature);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Direct signing failed.");
                }
              }}
              type="button"
            >
              Direct sign message
            </button>
            <button
              className="action-button secondary"
              disabled={!turnkeyActions.address}
              onClick={async () => {
                try {
                  setError("");
                  const signature = await turnkeyActions.signTypedData(typedDataPayload);
                  setTypedSignature(signature);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Typed-data signing failed.");
                }
              }}
              type="button"
            >
              Direct sign typed data
            </button>
          </div>
          {directSignature ? <pre className="mono-box">{directSignature}</pre> : null}
          {typedSignature ? <pre className="mono-box">{typedSignature}</pre> : null}
        </article>

        <article className="panel dashboard-panel stack">
          <p className="eyebrow">Direct Transaction</p>
          <h2>Send on the active chain through the Turnkey wallet client</h2>
          <p className="text-muted">
            Use Base Sepolia for lowest risk. The selected account still needs
            native gas on the active chain.
          </p>
          <div className="field">
            <label htmlFor="send-to">Recipient</label>
            <input
              id="send-to"
              onChange={(event) => setSendTo(event.target.value)}
              placeholder={selectedAddress ?? "0x..."}
              value={sendTo}
            />
          </div>
          <div className="field">
            <label htmlFor="send-amount">Value in ETH</label>
            <input
              id="send-amount"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00001"
              value={amount}
            />
          </div>
          <div className="button-row">
            <button
              className="action-button primary"
              disabled={!turnkeyActions.address}
              onClick={async () => {
                try {
                  setError("");
                  const hash = await turnkeyActions.sendTransaction({
                    to: (sendTo || selectedAddress || turnkeyActions.address) as `0x${string}`,
                    value: parseEther(amount || "0"),
                  });
                  setTransactionHash(hash);
                } catch (cause) {
                  setError(
                    cause instanceof Error ? cause.message : "Direct transaction submission failed.",
                  );
                }
              }}
              type="button"
            >
              Send direct transaction
            </button>
          </div>
          {transactionHash ? <pre className="mono-box">{transactionHash}</pre> : null}
          {error ? <div className="session-banner">{error}</div> : null}
        </article>
      </section>
    </main>
  );
}
