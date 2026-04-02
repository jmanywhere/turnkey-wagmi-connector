"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AuthState, useTurnkey } from "@turnkey/react-wallet-kit";
import {
  getTurnkeyRuntimeState,
  setReconnectRequired,
  subscribeTurnkeyRuntime,
} from "../provider/runtime-store";
import { getTurnkeySessionExpiryTimestamp } from "../provider/get-session-expiry";

/**
 * Session state and actions exposed by {@link useTurnkeySessionGate}.
 */
export type TurnkeySessionGate = {
  /** Current Turnkey authentication state. */
  authState: ReturnType<typeof useTurnkey>["authState"];
  /** Whether the UI should prompt the user to re-establish the Turnkey session. */
  reconnectRequired: boolean;
  /** Last recorded session or connector error, when available. */
  lastError?: string;
  /** Active Wagmi connector id observed by the bridge. */
  activeConnectorId?: string;
  /** Whether the current Turnkey session is authenticated and not expired. */
  isSessionValid: boolean;
  /** Session expiry in Unix milliseconds. */
  sessionExpiresAt?: number;
  /** Remaining session lifetime in seconds. */
  sessionSecondsRemaining?: number;
  /** Opens the Turnkey login flow. */
  connectTurnkey: () => Promise<void>;
  /** Requests an immediate Turnkey session refresh. */
  refreshSession: () => Promise<void>;
  /** Logs out of Turnkey so the bridge can tear down Wagmi connections on the next auth update. */
  disconnectAll: () => Promise<void>;
  /** Most recent session lifecycle event emitted by the provider callbacks. */
  lastEvent: ReturnType<typeof getTurnkeyRuntimeState>["lastEvent"];
  /** Timestamp for the most recent session lifecycle event. */
  lastEventAt?: number;
  /** Embedded EVM account resolved from the authenticated Turnkey wallets. */
  embeddedAccount: ReturnType<typeof getTurnkeyRuntimeState>["embeddedAccount"];
};

/**
 * Combines Turnkey auth state with package runtime state so consuming UIs can
 * decide whether connector operations should be allowed.
 */
export function useTurnkeySessionGate(): TurnkeySessionGate {
  const turnkey = useTurnkey();
  const runtime = useSyncExternalStore(
    subscribeTurnkeyRuntime,
    getTurnkeyRuntimeState,
    getTurnkeyRuntimeState,
  );
  const [now, setNow] = useState(() => Date.now());
  const sessionExpiresAt = getTurnkeySessionExpiryTimestamp(turnkey.session);

  useEffect(() => {
    if (!sessionExpiresAt) return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [sessionExpiresAt]);

  const sessionSecondsRemaining = sessionExpiresAt
    ? Math.max(0, Math.ceil((sessionExpiresAt - now) / 1000))
    : undefined;
  const isSessionValid = Boolean(
    turnkey.authState === AuthState.Authenticated &&
      turnkey.session &&
      sessionExpiresAt &&
      sessionExpiresAt > now,
  );

  return {
    authState: turnkey.authState,
    reconnectRequired: runtime.reconnectRequired,
    lastError: runtime.lastError,
    activeConnectorId: runtime.activeConnectorId,
    isSessionValid,
    sessionExpiresAt,
    sessionSecondsRemaining,
    connectTurnkey: () => turnkey.handleLogin(),
    refreshSession: async () => {
      await turnkey.refreshSession();
      setReconnectRequired(false);
    },
    disconnectAll: async () => {
      await turnkey.logout();
      setReconnectRequired(true, "Session closed");
    },
    lastEvent: runtime.lastEvent,
    lastEventAt: runtime.lastEvent?.at,
    embeddedAccount: runtime.embeddedAccount,
  };
}
