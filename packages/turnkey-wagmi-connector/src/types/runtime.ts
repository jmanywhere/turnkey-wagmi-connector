import type { AuthAction, Session } from "@turnkey/sdk-types";
import type { Wallet, WalletAccount } from "@turnkey/core";
import type { AuthMethod, AuthState } from "@turnkey/react-wallet-kit";

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

export type TurnkeyEmbeddedEvmAccount = {
  address: `0x${string}`;
  walletId: string;
  walletAccountId: string;
  wallet: Wallet;
  account: WalletAccount;
};

export type TurnkeyRuntimeState = {
  authState: AuthState;
  session?: Session;
  httpClient?: unknown;
  wallets: Wallet[];
  embeddedAccount?: TurnkeyEmbeddedEvmAccount;
  reconnectRequired: boolean;
  activeConnectorId?: string;
  lastEvent?: TurnkeySessionEvent;
  lastError?: string;
};
