"use client";

import { useMemo } from "react";
import { createWalletClient, custom, http, type Chain as ViemChain, type Hash, type Hex } from "viem";
import type {
  SendTransactionParameters,
  SignMessageParameters,
  SignTypedDataParameters,
} from "viem";
import { createAccount } from "@turnkey/viem";
import { useChainId, useChains } from "wagmi";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { useTurnkeySessionGate } from "./use-turnkey-session-gate";

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

function getRpcUrl(chain: ViemChain): string | undefined {
  return (
    chain.rpcUrls.default.http[0] ??
    chain.rpcUrls.public?.http?.[0]
  );
}

export function useTurnkeyWalletActions(): TurnkeyWalletActions {
  const turnkey = useTurnkey();
  const { embeddedAccount } = useTurnkeySessionGate();
  const chains = useChains();
  const chainId = useChainId();

  const chain = useMemo(
    () => chains.find((item) => item.id === chainId) ?? chains[0],
    [chainId, chains],
  );

  const walletPromise = useMemo(() => {
    if (!turnkey.session?.organizationId || !embeddedAccount || !turnkey.httpClient || !chain) {
      return undefined;
    }

    const rpcUrl = getRpcUrl(chain);
    const transport = rpcUrl
      ? http(rpcUrl)
      : custom({
          async request() {
            throw new Error("No RPC URL configured for the active chain.");
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
  }, [chain, embeddedAccount, turnkey.httpClient, turnkey.session?.organizationId]);

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
