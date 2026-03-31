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
  resetTurnkeyRuntimeState,
  setEmbeddedAccount,
  setReconnectRequired,
  setTurnkeyRuntimeEvent,
  setTurnkeyRuntimeState,
} from "./runtime-store";

export type TurnkeySessionProviderProps = PropsWithChildren<{
  turnkeyConfig: TurnkeyProviderConfig;
  callbacks?: TurnkeyCallbacks;
}>;

function TurnkeyRuntimeSync() {
  const turnkey = useTurnkey();

  useEffect(() => {
    setTurnkeyRuntimeState({
      authState: turnkey.authState,
      session: turnkey.session,
      sessionExpiresAt: turnkey.session?.expiry
        ? Number(turnkey.session.expiry) * 1000
        : undefined,
      httpClient: turnkey.httpClient,
      wallets: turnkey.wallets,
    });
    setEmbeddedAccount(resolveEmbeddedEvmAccount(turnkey.wallets));
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
      setReconnectRequired(true, "Turnkey session expired");
      setTurnkeyRuntimeEvent({
        type: "expired",
        sessionKey: params.sessionKey,
        at: Date.now(),
      });
      callbacks?.onSessionExpired?.(params);
    },
    onAuthenticationSuccess: (params) => {
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
