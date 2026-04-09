"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppKitAccountButton,
  AppKitConnectButton,
  AppKitNetworkButton,
} from "@reown/appkit/react";
import { useAccount, useBalance, useChainId, useConnections } from "wagmi";
import { useTurnkeySessionGate } from "turnkey-wagmi-connector";
import { AlertTriangle, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CopyButton } from "@/components/copy-button";
import { isReownConfigured, isTurnkeyConfigured } from "@/lib/env";
import { SHARED_RUNTIME_CONNECT_HEADER_ID } from "@/lib/shared-runtime-scroll";

export function SharedRuntime() {
  const sessionGate = useTurnkeySessionGate();
  const account = useAccount();
  const chainId = useChainId();
  const connections = useConnections();
  const [disconnectNotice, setDisconnectNotice] = useState<string>("");
  const { data: balance, error: balanceError } = useBalance({
    address: account.address,
    chainId: account.chainId ?? chainId,
    query: {
      enabled: account.isConnected && Boolean(account.address),
    },
  });

  const connectedAddress = account.isConnected ? account.address : undefined;

  useEffect(() => {
    if (sessionGate.authState === "authenticated") {
      setDisconnectNotice("");
    }
  }, [sessionGate.authState]);

  const alerts = useMemo(() => {
    const items: string[] = [];

    if (!isTurnkeyConfigured) {
      items.push(
        "Turnkey env vars are missing. Embedded auth cannot complete until the auth proxy and organization values are configured.",
      );
    }

    if (!isReownConfigured) {
      items.push(
        "Reown project ID is missing. External wallet switching stays unavailable until the project ID is set.",
      );
    }

    if (sessionGate.authState === "unauthenticated" && account.isConnected) {
      items.push(
        "Turnkey is unauthenticated. The active Wagmi wallet remains connected, but Turnkey-only embedded actions stay unavailable until you sign in again.",
      );
    }

    if (sessionGate.reconnectRequired) {
      items.push(
        `Turnkey session is unavailable. Turnkey-backed actions stay paused until you reconnect.${sessionGate.lastError ? ` Reason: ${sessionGate.lastError}` : ""}`,
      );
    }

    if (sessionGate.connectorError) {
      items.push(
        `Turnkey connector could not finish connecting. Your Turnkey session is still active, but RPC-backed connector actions stay paused until the transport recovers or you reconnect. Reason: ${sessionGate.connectorError}`,
      );
    }

    if (balanceError) {
      items.push(`Native balance fetch failed: ${balanceError.message}`);
    }

    return items;
  }, [
    account.isConnected,
    balanceError,
    sessionGate.authState,
    sessionGate.connectorError,
    sessionGate.lastError,
    sessionGate.reconnectRequired,
  ]);

  const activeConnector = connections.at(0)?.connector;
  const expiresLabel = sessionGate.sessionExpiresAt
    ? new Date(sessionGate.sessionExpiresAt).toLocaleString()
    : "n/a";
  const balanceLabel = balance
    ? `${balance.formatted} ${balance.symbol}`
    : "n/a";

  return (
    <Card>
      <CardHeader
        className="scroll-mt-28"
        id={SHARED_RUNTIME_CONNECT_HEADER_ID}
      >
        <CardTitle className="text-lg">Shared Runtime</CardTitle>
        <CardDescription>
          Connect once — the same Turnkey, Wagmi, Reown AppKit, and LI.FI state
          persists across all sections below.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {alerts.map((alert) => (
          <Alert variant="destructive" key={alert}>
            <AlertTriangle className="size-4" />
            <AlertDescription>{alert}</AlertDescription>
          </Alert>
        ))}

        {disconnectNotice ? (
          <Alert>
            <CircleCheck className="size-4" />
            <AlertDescription>{disconnectNotice}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setDisconnectNotice("");
              void sessionGate.connectTurnkey();
            }}
            type="button"
          >
            Connect Turnkey
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDisconnectNotice("");
              void sessionGate.refreshSession();
            }}
            type="button"
          >
            Refresh session
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void sessionGate
                .disconnectAll()
                .then(() => {
                  setDisconnectNotice("Successfully disconnected.");
                })
                .catch(() => {
                  setDisconnectNotice("");
                });
            }}
            type="button"
          >
            Disconnect Turnkey
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AppKitConnectButton />
          {connectedAddress ? (
            <>
              <AppKitAccountButton />
              <AppKitNetworkButton />
            </>
          ) : null}
        </div>

        <dl className="grid gap-0 text-sm">
          {(
            [
              ["Auth state", sessionGate.authState],
              ["Session valid", sessionGate.isSessionValid ? "yes" : "no"],
              ["Connector", activeConnector?.name ?? "none"],
              [
                "Wallet mode",
                activeConnector?.id === "turnkey"
                  ? "turnkey embedded"
                  : connectedAddress
                    ? "external wallet"
                    : "none",
              ],
              ["Chain", String(account.chainId ?? "n/a")],
              [
                "Active address",
                account.address ?? "not connected",
                account.address,
              ],
              [
                "Embedded address",
                sessionGate.embeddedAccount?.address ?? "not resolved",
                sessionGate.embeddedAccount?.address,
              ],
              ["Balance", balanceLabel],
              [
                "Expires in",
                sessionGate.sessionSecondsRemaining !== undefined
                  ? `${sessionGate.sessionSecondsRemaining}s`
                  : "n/a",
              ],
              ["Expires at", expiresLabel],
            ] as Array<[string, string, string?]>
          ).map(([label, value, copyable]) => (
            <div
              key={label}
              className="grid grid-cols-[10rem_minmax(0,1fr)] items-center gap-3 border-t py-2.5 first:border-t-0 first:pt-0 max-sm:grid-cols-1 max-sm:gap-0.5"
            >
              <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {label}
              </dt>
              <dd className="flex items-center justify-between gap-2 break-all">
                <span className="min-w-0">{value}</span>
                {copyable ? <CopyButton text={copyable} /> : null}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
