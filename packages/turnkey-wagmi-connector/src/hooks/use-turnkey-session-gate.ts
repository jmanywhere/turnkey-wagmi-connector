"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import {
  getTurnkeyRuntimeState,
  setReconnectRequired,
  subscribeTurnkeyRuntime,
} from "../provider/runtime-store";

export type TurnkeySessionGate = {
  authState: ReturnType<typeof useTurnkey>["authState"];
  reconnectRequired: boolean;
  lastError?: string;
  activeConnectorId?: string;
  isSessionValid: boolean;
  sessionExpiresAt?: number;
  sessionSecondsRemaining?: number;
  connectTurnkey: () => Promise<void>;
  refreshSession: () => Promise<void>;
  disconnectAll: () => Promise<void>;
  lastEvent: ReturnType<typeof getTurnkeyRuntimeState>["lastEvent"];
  lastEventAt?: number;
  embeddedAccount: ReturnType<typeof getTurnkeyRuntimeState>["embeddedAccount"];
};

export function useTurnkeySessionGate(): TurnkeySessionGate {
  const turnkey = useTurnkey();
  const runtime = useSyncExternalStore(
    subscribeTurnkeyRuntime,
    getTurnkeyRuntimeState,
    getTurnkeyRuntimeState,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!runtime.sessionExpiresAt) return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [runtime.sessionExpiresAt]);

  const sessionExpiresAt = runtime.sessionExpiresAt;
  const sessionSecondsRemaining = sessionExpiresAt
    ? Math.max(0, Math.ceil((sessionExpiresAt - now) / 1000))
    : undefined;
  const isSessionValid = Boolean(
    runtime.authState === "authenticated" &&
      runtime.session &&
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
