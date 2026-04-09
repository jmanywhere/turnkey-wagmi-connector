"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import {
  TurnkeyProvider,
  type TurnkeyCallbacks,
  type TurnkeyProviderConfig,
  useTurnkey,
} from "@turnkey/react-wallet-kit";
import { resolveEmbeddedEvmAccount } from "./resolve-embedded-account";
import {
  clearConnectorError,
  resetTurnkeyRuntimeState,
  setReconnectRequired,
  setTurnkeyRuntimeEvent,
  setTurnkeyRuntimeState,
} from "./runtime-store";
import { getTurnkeySessionExpiryTimestamp } from "./get-session-expiry";

/**
 * Props for {@link TurnkeySessionProvider}.
 */
export type TurnkeySessionProviderProps = PropsWithChildren<{
  /** Turnkey Wallet Kit configuration passed through to `TurnkeyProvider`. */
  turnkeyConfig: TurnkeyProviderConfig;
  /** Optional Turnkey lifecycle callbacks to compose with the package callbacks. */
  callbacks?: TurnkeyCallbacks;
}>;

function TurnkeyRuntimeSync() {
  const turnkey = useTurnkey();

  useEffect(() => {
    const embeddedAccount = resolveEmbeddedEvmAccount(turnkey.wallets);

    setTurnkeyRuntimeState({
      authState: turnkey.authState,
      session: turnkey.session,
      sessionExpiresAt: getTurnkeySessionExpiryTimestamp(turnkey.session),
      httpClient: turnkey.httpClient,
      wallets: turnkey.wallets,
      embeddedAccount,
    });
  }, [
    turnkey.authState,
    turnkey.httpClient,
    turnkey.session?.expiry,
    turnkey.session,
    turnkey.wallets,
  ]);

  useEffect(() => resetTurnkeyRuntimeState, []);

  return null;
}

/**
 * Mirrors Turnkey auth/session state into the connector runtime store so Wagmi
 * can gate access to the embedded wallet.
 */
export function TurnkeySessionProvider({
  children,
  turnkeyConfig,
  callbacks,
}: TurnkeySessionProviderProps) {
  const mergedCallbacks: TurnkeyCallbacks = {
    ...callbacks,
    beforeSessionExpiry: (params) => {
      setTurnkeyRuntimeEvent({
        type: "before-expiry",
        sessionKey: params.sessionKey,
        at: Date.now(),
      });
      callbacks?.beforeSessionExpiry?.(params);
    },
    onSessionExpired: (params) => {
      clearConnectorError();
      setReconnectRequired(true, "Turnkey session expired");
      setTurnkeyRuntimeEvent({
        type: "expired",
        sessionKey: params.sessionKey,
        at: Date.now(),
      });
      callbacks?.onSessionExpired?.(params);
    },
    onAuthenticationSuccess: (params) => {
      clearConnectorError();
      setReconnectRequired(false);
      setTurnkeyRuntimeEvent({
        type: "auth-success",
        action: params.action,
        method: params.method,
        identifier: params.identifier,
        at: Date.now(),
      });
      callbacks?.onAuthenticationSuccess?.(params);
    },
  };

  return (
    <TurnkeyProvider config={turnkeyConfig} callbacks={mergedCallbacks}>
      <TurnkeyRuntimeSync />
      {children}
    </TurnkeyProvider>
  );
}
