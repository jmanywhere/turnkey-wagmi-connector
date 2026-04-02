import type { AuthAction, Session } from "@turnkey/sdk-types";
import type { Wallet, WalletAccount } from "@turnkey/core";
import type { AuthMethod, AuthState } from "@turnkey/react-wallet-kit";

/**
 * Lifecycle events surfaced by the package so hooks and bridge logic can react
 * to Turnkey session changes without reading provider callbacks directly.
 */
export type TurnkeySessionEvent =
  | { type: "before-expiry"; sessionKey?: string; at: number }
  | { type: "expired"; sessionKey?: string; at: number }
  | {
      type: "auth-success";
      at: number;
      action: AuthAction;
      method: AuthMethod;
      identifier: string;
    };

/**
 * Embedded Turnkey wallet metadata for the active EVM account.
 */
export type TurnkeyEmbeddedEvmAccount = {
  address: `0x${string}`;
  walletId: string;
  walletAccountId: string;
  wallet: Wallet;
  account: WalletAccount;
};

/**
 * Shared runtime snapshot used by the connector, bridge, and hooks.
 */
export type TurnkeyRuntimeState = {
  authState: AuthState;
  session?: Session;
  sessionExpiresAt?: number;
  httpClient?: unknown;
  wallets: Wallet[];
  embeddedAccount?: TurnkeyEmbeddedEvmAccount;
  reconnectRequired: boolean;
  activeConnectorId?: string;
  lastEvent?: TurnkeySessionEvent;
  lastError?: string;
};
