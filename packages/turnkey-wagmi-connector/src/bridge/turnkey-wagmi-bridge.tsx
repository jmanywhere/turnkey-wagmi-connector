"use client";

import { useEffect, useRef, useTransition } from "react";
import { connect, disconnect, getConnections, getConnectors, type Config } from "@wagmi/core";
import { AuthState, useTurnkey } from "@turnkey/react-wallet-kit";
import {
  setActiveConnectorId,
  setReconnectRequired,
} from "../provider/runtime-store";
import { useTurnkeySessionGate } from "../hooks/use-turnkey-session-gate";

export type TurnkeyWagmiBridgeProps = {
  wagmiConfig: Config;
  turnkeyConnectorId?: string;
  refreshLeadTimeMs?: number;
  autoConnectTurnkey?: boolean;
};

async function disconnectAllConnections(config: Config) {
  const connections = getConnections(config);
  for (const connection of connections) {
    await disconnect(config, { connector: connection.connector });
  }
}

export function TurnkeyWagmiBridge({
  wagmiConfig,
  turnkeyConnectorId = "turnkey",
  autoConnectTurnkey = true,
}: TurnkeyWagmiBridgeProps) {
  const turnkey = useTurnkey();
  const sessionGate = useTurnkeySessionGate();
  const [, startTransition] = useTransition();
  const lastHandledEvent = useRef<number>(0);

  useEffect(() => {
    const connections = getConnections(wagmiConfig);
    setActiveConnectorId(connections[0]?.connector.id);
  }, [wagmiConfig, turnkey.authState, turnkey.session, sessionGate.lastEventAt]);

  useEffect(() => {
    if (!autoConnectTurnkey) return;
    if (turnkey.authState !== AuthState.Authenticated) return;
    if (!sessionGate.embeddedAccount) return;
    if (getConnections(wagmiConfig).length > 0) return;

    const connector = getConnectors(wagmiConfig).find(
      (item: { id: string }) => item.id === turnkeyConnectorId,
    );
    if (!connector) return;

    startTransition(() => {
      void connect(wagmiConfig, {
        connector,
        chainId: wagmiConfig.chains[0]?.id,
      }).catch((error: unknown) => {
        setReconnectRequired(true, error instanceof Error ? error.message : String(error));
      });
    });
  }, [
    autoConnectTurnkey,
    sessionGate.embeddedAccount,
    turnkey.authState,
    turnkeyConnectorId,
    wagmiConfig,
  ]);

  useEffect(() => {
    const event = sessionGate.lastEvent;
    if (!event || event.at <= lastHandledEvent.current) return;
    lastHandledEvent.current = event.at;

    if (event.type === "before-expiry") {
      startTransition(() => {
        void turnkey
          .refreshSession()
          .then(() => setReconnectRequired(false))
          .catch(async (error: unknown) => {
            setReconnectRequired(
              true,
              error instanceof Error ? error.message : "Turnkey session refresh failed",
            );
            await disconnectAllConnections(wagmiConfig);
          });
      });
      return;
    }

    if (event.type === "expired") {
      startTransition(() => {
        void disconnectAllConnections(wagmiConfig);
      });
    }
  }, [sessionGate.lastEvent, turnkey, wagmiConfig]);

  useEffect(() => {
    if (turnkey.authState === AuthState.Unauthenticated) {
      startTransition(() => {
        void disconnectAllConnections(wagmiConfig);
      });
    }
  }, [turnkey.authState, wagmiConfig]);

  return null;
}
