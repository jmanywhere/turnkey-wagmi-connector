"use client";

import { useMemo } from "react";
import { createWalletClient, custom, type Chain as ViemChain, type Hash, type Hex } from "viem";
import type {
  SendTransactionParameters,
  SignMessageParameters,
  SignTypedDataParameters,
} from "viem";
import { createAccount } from "@turnkey/viem";
import { useChainId, useConfig } from "wagmi";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { useTurnkeySessionGate } from "./use-turnkey-session-gate";

/**
 * Direct Turnkey-backed wallet actions that bypass generic provider RPC flows.
 */
export type TurnkeyWalletActions = {
  address?: `0x${string}`;
  chainId?: number;
  signMessage: (
    args: Omit<SignMessageParameters, "account">,
  ) => Promise<Hex>;
  signTypedData: (
    args: Omit<SignTypedDataParameters, "account">,
  ) => Promise<Hex>;
  sendTransaction: (
    args: Omit<SendTransactionParameters<ViemChain>, "account">,
  ) => Promise<Hash>;
};

/**
 * Returns viem wallet actions backed by the active Turnkey embedded account.
 */
export function useTurnkeyWalletActions(): TurnkeyWalletActions {
  const wagmiConfig = useConfig();
  const turnkey = useTurnkey();
  const { embeddedAccount } = useTurnkeySessionGate();
  const chainId = useChainId();

  const chain = useMemo(
    () => wagmiConfig.chains.find((item) => item.id === chainId) ?? wagmiConfig.chains[0],
    [chainId, wagmiConfig.chains],
  );

  const walletPromise = useMemo(() => {
    if (!turnkey.session?.organizationId || !embeddedAccount || !turnkey.httpClient || !chain) {
      return undefined;
    }

    const publicClient = wagmiConfig.getClient({ chainId: chain.id });
    const transport =
      publicClient
        ? custom({
            request: publicClient.request,
          })
        :
      custom({
        async request() {
          throw new Error("No Wagmi transport configured for the active chain.");
        },
      });

    return createAccount({
      client: turnkey.httpClient as never,
      organizationId: turnkey.session.organizationId,
      signWith: embeddedAccount.address,
      ethereumAddress: embeddedAccount.address,
    }).then((account) =>
      createWalletClient({
        account,
        chain,
        transport,
      }),
    );
  }, [
    chain,
    embeddedAccount,
    turnkey.httpClient,
    turnkey.session?.organizationId,
    wagmiConfig,
  ]);

  return {
    address: embeddedAccount?.address,
    chainId: chain?.id,
    async signMessage(args) {
      const walletClient = await walletPromise;
      if (!walletClient) throw new Error("Turnkey wallet client is unavailable.");
      return walletClient.signMessage(args as SignMessageParameters);
    },
    async signTypedData(args) {
      const walletClient = await walletPromise;
      if (!walletClient) throw new Error("Turnkey wallet client is unavailable.");
      return walletClient.signTypedData(args as SignTypedDataParameters);
    },
    async sendTransaction(args) {
      const walletClient = await walletPromise;
      if (!walletClient) throw new Error("Turnkey wallet client is unavailable.");
      return walletClient.sendTransaction(args as SendTransactionParameters<ViemChain>);
    },
  };
}
