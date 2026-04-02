import { AuthState } from "@turnkey/react-wallet-kit";
import type {
  TurnkeyEmbeddedEvmAccount,
  TurnkeyRuntimeState,
  TurnkeySessionEvent,
} from "../types/runtime";

const DEFAULT_STATE: TurnkeyRuntimeState = {
  authState: AuthState.Unauthenticated,
  wallets: [],
  reconnectRequired: false,
};

let state: TurnkeyRuntimeState = DEFAULT_STATE;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

/**
 * Reads the current in-memory Turnkey runtime snapshot.
 */
export function getTurnkeyRuntimeState(): TurnkeyRuntimeState {
  return state;
}

/**
 * Subscribes to runtime-store updates.
 */
export function subscribeTurnkeyRuntime(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Applies a partial update or functional update to the runtime store.
 */
export function setTurnkeyRuntimeState(
  updater:
    | Partial<TurnkeyRuntimeState>
    | ((current: TurnkeyRuntimeState) => TurnkeyRuntimeState),
) {
  state =
    typeof updater === "function"
      ? updater(state)
      : {
          ...state,
          ...updater,
        };
  emit();
}

/**
 * Resets the runtime store to its unauthenticated default state.
 */
export function resetTurnkeyRuntimeState() {
  state = DEFAULT_STATE;
  emit();
}

/**
 * Records the latest Turnkey session lifecycle event.
 */
export function setTurnkeyRuntimeEvent(event: TurnkeySessionEvent) {
  setTurnkeyRuntimeState((current) => ({
    ...current,
    lastEvent: event,
  }));
}

/**
 * Marks whether the app should prompt the user to reconnect the Turnkey
 * session, optionally storing the most recent error.
 */
export function setReconnectRequired(
  reconnectRequired: boolean,
  lastError?: string,
) {
  setTurnkeyRuntimeState((current) => ({
    ...current,
    reconnectRequired,
    lastError,
  }));
}

/**
 * Persists the currently active Wagmi connector id.
 */
export function setActiveConnectorId(activeConnectorId?: string) {
  setTurnkeyRuntimeState((current) => ({
    ...current,
    activeConnectorId,
  }));
}

/**
 * Stores the embedded EVM account resolved from the current Turnkey wallets.
 */
export function setEmbeddedAccount(
  embeddedAccount?: TurnkeyEmbeddedEvmAccount,
) {
  setTurnkeyRuntimeState((current) => ({
    ...current,
    embeddedAccount,
  }));
}
