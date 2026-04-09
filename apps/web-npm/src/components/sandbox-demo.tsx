"use client";

import { useState } from "react";
import Link from "next/link";
import { parseEther } from "viem";
import { useTurnkeyWalletActions } from "turnkey-wagmi-connector";
import { isTurnkeyConfigured } from "@/lib/env";

const typedDataPayload = {
  domain: {
    name: "Turnkey Sandbox",
    version: "1",
    chainId: 84532,
  },
  primaryType: "SandboxMessage" as const,
  types: {
    SandboxMessage: [
      { name: "purpose", type: "string" },
      { name: "timestamp", type: "string" },
    ],
  },
  message: {
    purpose: "Verify direct Turnkey viem signing",
    timestamp: new Date().toISOString(),
  },
};

export function SandboxDemo() {
  const turnkeyActions = useTurnkeyWalletActions();
  const [messageSignature, setMessageSignature] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [amount, setAmount] = useState("0");
  const [error, setError] = useState("");

  const targetAddress = sendTo || turnkeyActions.address || "";

  return (
    <div className="route-layout stack">
      <header className="route-header">
        <div className="stack">
          <p className="eyebrow">Direct Action Sandbox</p>
          <h1>Turnkey-backed Viem actions on Base Sepolia.</h1>
          <p className="text-muted">
            These calls bypass generic wallet-provider semantics and use
            <code> @turnkey/viem </code> directly. The active embedded EVM
            account stays session-gated by the same Turnkey runtime.
          </p>
        </div>
        <div className="button-row">
          <Link href="/" className="secondary-link">
            Back home
          </Link>
          <Link href="/widget" className="secondary-link">
            Widget demo
          </Link>
        </div>
      </header>

      {!isTurnkeyConfigured ? (
        <div className="session-banner">
          Turnkey env vars are missing. Direct signing will stay unavailable
          until the auth proxy config and organization ID are provided.
        </div>
      ) : null}

      <section className="dashboard-grid">
        <article className="panel dashboard-panel stack">
          <div className="status-grid">
            <div className="status-card">
              <span className="status-label">Embedded address</span>
              <div className="status-value">
                {turnkeyActions.address ?? "not connected"}
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">Active chain</span>
              <div className="status-value">
                {turnkeyActions.chainId ?? "not resolved"}
              </div>
            </div>
          </div>

          <div className="button-row">
            <button
              className="action-button primary"
              disabled={!turnkeyActions.address}
              onClick={async () => {
                try {
                  setError("");
                  const result = await turnkeyActions.signMessage({
                    message: `Turnkey direct sign :: ${new Date().toISOString()}`,
                  });
                  setMessageSignature(result);
                } catch (cause) {
                  setError(
                    cause instanceof Error ? cause.message : "Message signing failed.",
                  );
                }
              }}
              type="button"
            >
              Sign message
            </button>
            <button
              className="action-button secondary"
              disabled={!turnkeyActions.address}
              onClick={async () => {
                try {
                  setError("");
                  const result = await turnkeyActions.signTypedData(
                    typedDataPayload,
                  );
                  setTypedSignature(result);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Typed data signing failed.",
                  );
                }
              }}
              type="button"
            >
              Sign typed data
            </button>
          </div>

          {messageSignature ? (
            <pre className="mono-box">{messageSignature}</pre>
          ) : null}
          {typedSignature ? <pre className="mono-box">{typedSignature}</pre> : null}
        </article>

        <article className="panel dashboard-panel stack">
          <p className="eyebrow">Send Transaction</p>
          <h2>Base Sepolia transfer via Turnkey</h2>
          <div className="field">
            <label htmlFor="send-to">Recipient</label>
            <input
              id="send-to"
              onChange={(event) => setSendTo(event.target.value)}
              placeholder="0x..."
              value={sendTo}
            />
          </div>
          <div className="field">
            <label htmlFor="send-amount">Value in ETH</label>
            <input
              id="send-amount"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.0001"
              value={amount}
            />
          </div>
          <div className="button-row">
            <button
              className="action-button primary"
              disabled={!turnkeyActions.address || !targetAddress}
              onClick={async () => {
                try {
                  setError("");
                  const hash = await turnkeyActions.sendTransaction({
                    to: targetAddress as `0x${string}`,
                    value: parseEther(amount || "0"),
                  });
                  setTransactionHash(hash);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Transaction submission failed.",
                  );
                }
              }}
              type="button"
            >
              Send direct transaction
            </button>
          </div>
          {transactionHash ? (
            <pre className="mono-box">{transactionHash}</pre>
          ) : null}
          {error ? <div className="session-banner">{error}</div> : null}
        </article>
      </section>
    </div>
  );
}
