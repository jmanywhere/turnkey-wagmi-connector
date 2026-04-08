"use client";

import { useEffect, useRef, useTransition } from "react";
import { connect, disconnect, getConnections, getConnectors, type Config } from "@wagmi/core";
import { useConfig, useConnections } from "wagmi";
import { AuthState, useTurnkey } from "@turnkey/react-wallet-kit";
import {
  setActiveConnectorId,
  setReconnectRequired,
} from "../provider/runtime-store";
import { useTurnkeySessionGate } from "../hooks/use-turnkey-session-gate";

/**
 * Props for {@link TurnkeyWagmiBridge}.
 */
export type TurnkeyWagmiBridgeProps = {
  /** Connector id used to locate the Turnkey connector in the active Wagmi config. */
  turnkeyConnectorId?: string;
  /**
   * Reserved for future session refresh timing controls.
   *
   * @deprecated This prop is currently ignored by the implementation.
   */
  refreshLeadTimeMs?: number;
  /** Automatically connects the Turnkey connector after authentication. */
  autoConnectTurnkey?: boolean;
};

async function disconnectMatchingConnections(
  config: Config,
  shouldDisconnect: (connection: ReturnType<typeof getConnections>[number]) => boolean,
) {
  const connections = getConnections(config);
  const remainingConnections = connections.filter((connection) => !shouldDisconnect(connection));
  for (const connection of connections) {
    if (!shouldDisconnect(connection)) continue;

    await disconnect(config, { connector: connection.connector }).catch(async () => {
      await connection.connector.disconnect().catch(() => undefined);
    });
  }

  setActiveConnectorId(remainingConnections[0]?.connector.id);
}

export async function disconnectAllConnections(config: Config) {
  await disconnectMatchingConnections(config, () => true);
}

export async function disconnectTurnkeyConnections(
  config: Config,
  turnkeyConnectorId: string,
) {
  await disconnectMatchingConnections(
    config,
    (connection) => connection.connector.id === turnkeyConnectorId,
  );
}

async function disconnectForExpiredSession(
  wagmiConfig: Config,
  logout: () => Promise<void>,
  turnkeyConnectorId: string,
) {
  await disconnectTurnkeyConnections(wagmiConfig, turnkeyConnectorId);
  await logout().catch(() => undefined);
}

/**
 * Keeps Wagmi connection state aligned with the current Turnkey session.
 */
export function TurnkeyWagmiBridge({
  turnkeyConnectorId = "turnkey",
  autoConnectTurnkey = true,
}: TurnkeyWagmiBridgeProps) {
  const wagmiConfig = useConfig();
  const connections = useConnections();
  const turnkey = useTurnkey();
  const sessionGate = useTurnkeySessionGate();
  const [, startTransition] = useTransition();
  const lastHandledEvent = useRef<number>(0);

  useEffect(() => {
    setActiveConnectorId(connections[0]?.connector.id);
  }, [connections]);

  useEffect(() => {
    if (!autoConnectTurnkey) return;
    if (turnkey.authState !== AuthState.Authenticated) return;
    if (!turnkey.session) return;
    if (!sessionGate.isSessionValid) return;
    if (!sessionGate.embeddedAccount) return;
    if (connections.length > 0) return;

    const connector = getConnectors(wagmiConfig).find(
      (item: { id: string }) => item.id === turnkeyConnectorId,
    );
    if (!connector) return;

    startTransition(() => {
      void connect(wagmiConfig, {
        connector,
        chainId: wagmiConfig.chains[0]?.id,
      })
        .then(() => {
          setReconnectRequired(false);
          setActiveConnectorId(turnkeyConnectorId);
        })
        .catch((error: unknown) => {
          setReconnectRequired(true, error instanceof Error ? error.message : String(error));
        });
    });
  }, [
    autoConnectTurnkey,
    sessionGate.embeddedAccount,
    sessionGate.isSessionValid,
    turnkey.authState,
    turnkey.session,
    turnkeyConnectorId,
    wagmiConfig,
    connections,
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
            await disconnectTurnkeyConnections(wagmiConfig, turnkeyConnectorId);
          });
      });
      return;
    }

    if (event.type === "expired") {
      startTransition(() => {
        void disconnectForExpiredSession(wagmiConfig, turnkey.logout, turnkeyConnectorId);
      });
    }
  }, [sessionGate.lastEvent, turnkey, turnkeyConnectorId, wagmiConfig]);

  useEffect(() => {
    if (turnkey.authState === AuthState.Unauthenticated) {
      startTransition(() => {
        void disconnectTurnkeyConnections(wagmiConfig, turnkeyConnectorId);
      });
    }
  }, [turnkey.authState, turnkeyConnectorId, wagmiConfig]);

  useEffect(() => {
    if (turnkey.authState !== AuthState.Authenticated) return;
    if (!turnkey.session) return;
    if (sessionGate.isSessionValid) return;

    setReconnectRequired(true, "Turnkey session expired");
    startTransition(() => {
      void disconnectForExpiredSession(wagmiConfig, turnkey.logout, turnkeyConnectorId);
    });
  }, [
    sessionGate.isSessionValid,
    turnkey.authState,
    turnkey.logout,
    turnkey.session,
    turnkeyConnectorId,
    wagmiConfig,
  ]);

  return null;
}
