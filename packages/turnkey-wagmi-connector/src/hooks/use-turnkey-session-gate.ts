"use client";

import { useSyncExternalStore } from "react";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import {
  getTurnkeyRuntimeState,
  setReconnectRequired,
  subscribeTurnkeyRuntime,
} from "../provider/runtime-store";

export type TurnkeySessionGate = {
  authState: ReturnType<typeof useTurnkey>["authState"];
  reconnectRequired: boolean;
  activeConnectorId?: string;
  isSessionValid: boolean;
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

  return {
    authState: turnkey.authState,
    reconnectRequired: runtime.reconnectRequired,
    activeConnectorId: runtime.activeConnectorId,
    isSessionValid: Boolean(runtime.session && runtime.authState === "authenticated"),
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
