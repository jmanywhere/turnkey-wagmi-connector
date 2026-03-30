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

export function getTurnkeyRuntimeState(): TurnkeyRuntimeState {
  return state;
}

export function subscribeTurnkeyRuntime(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

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

export function resetTurnkeyRuntimeState() {
  state = DEFAULT_STATE;
  emit();
}

export function setTurnkeyRuntimeEvent(event: TurnkeySessionEvent) {
  setTurnkeyRuntimeState((current) => ({
    ...current,
    lastEvent: event,
  }));
}

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

export function setActiveConnectorId(activeConnectorId?: string) {
  setTurnkeyRuntimeState((current) => ({
    ...current,
    activeConnectorId,
  }));
}

export function setEmbeddedAccount(
  embeddedAccount?: TurnkeyEmbeddedEvmAccount,
) {
  setTurnkeyRuntimeState((current) => ({
    ...current,
    embeddedAccount,
  }));
}
