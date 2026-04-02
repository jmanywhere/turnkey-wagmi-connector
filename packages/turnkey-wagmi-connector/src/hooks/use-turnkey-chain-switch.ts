"use client";

import { connect, getConnections, getConnectors, switchChain as wagmiSwitchChain } from "@wagmi/core";
import type { Config } from "@wagmi/core";
import { numberToHex, type Hex } from "viem";
import { useTurnkeySessionGate } from "./use-turnkey-session-gate";

/**
 * Chain switching actions exposed by {@link useTurnkeyChainSwitch}.
 */
export type TurnkeyChainSwitch = {
  /** Switches the active connector or Turnkey provider to the given EVM chain id. */
  switchChain: (chainId: number) => Promise<void>;
};

async function switchTurnkeyConnectorChain(connector: {
  switchChain?: (args: { chainId: number }) => Promise<unknown>;
  getProvider?: (args?: { chainId?: number }) => Promise<{
    request: (args: {
      method: string;
      params?: unknown[];
    }) => Promise<unknown>;
  }>;
}, chainId: number) {
  if (typeof connector.getProvider === "function") {
    const provider = await connector.getProvider({ chainId });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: numberToHex(BigInt(chainId)) as Hex }],
    });
    return;
  }

  if (typeof connector.switchChain === "function") {
    await connector.switchChain({ chainId });
    return;
  }

  throw new Error("Turnkey connector does not expose a chain switch fallback.");
}

/**
 * Returns a chain-switch helper that prefers Wagmi's active connector, while
 * falling back to direct Turnkey provider switching when necessary.
 */
export function useTurnkeyChainSwitch(wagmiConfig: Config): TurnkeyChainSwitch {
  const sessionGate = useTurnkeySessionGate();

  return {
    switchChain: async (chainId: number) => {
      const connections = getConnections(wagmiConfig);
      if (connections.length > 0) {
        const activeConnection = connections[0];

        try {
          await wagmiSwitchChain(wagmiConfig, { chainId });
          return;
        } catch (error) {
          if (activeConnection.connector.id !== "turnkey") {
            throw error;
          }

          await switchTurnkeyConnectorChain(activeConnection.connector as never, chainId);
          return;
        }
      }

      const connector = getConnectors(wagmiConfig).find((item) => item.id === "turnkey");
      if (!connector) {
        throw new Error("Turnkey connector is not configured.");
      }

      if (!sessionGate.isSessionValid) {
        throw new Error("A valid Turnkey session is required before switching chains.");
      }

      await connect(wagmiConfig, {
        connector,
        chainId,
      });
    },
  };
}
