"use client";

import { useMemo } from "react";
import { createAccount } from "@turnkey/viem";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import {
  createWalletClient,
  custom,
  http,
  type Chain,
  type LocalAccount,
  type Hash,
  type Hex,
  type SendTransactionParameters,
  type SignMessageParameters,
  type SignTypedDataParameters,
} from "viem";
import { useChainId, useChains } from "wagmi";
import { resolveEmbeddedAccount } from "./resolve-embedded-account";

function getRpcUrl(chain: Chain): string | undefined {
  return chain.rpcUrls.default.http[0] ?? chain.rpcUrls.public?.http?.[0];
}

export function useDirectTurnkeyActions() {
  const turnkey = useTurnkey();
  const chainId = useChainId();
  const chains = useChains();
  const embeddedAccount = useMemo(
    () => resolveEmbeddedAccount(turnkey.wallets),
    [turnkey.wallets],
  );

  const chain = useMemo(
    () => chains.find((item) => item.id === chainId) ?? chains[0],
    [chainId, chains],
  );

  const walletPromise = useMemo(() => {
    if (
      !turnkey.httpClient ||
      !turnkey.session?.organizationId ||
      !embeddedAccount ||
      !chain
    ) {
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
    }).then((account: LocalAccount) =>
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
  ]);

  return {
    address: embeddedAccount?.address,
    chainId: chain?.id,
    async signMessage(args: Omit<SignMessageParameters, "account">): Promise<Hex> {
      const walletClient = await walletPromise;
      if (!walletClient) throw new Error("Turnkey wallet client is unavailable.");
      return walletClient.signMessage(args as SignMessageParameters);
    },
    async signTypedData(
      args: Omit<SignTypedDataParameters, "account">,
    ): Promise<Hex> {
      const walletClient = await walletPromise;
      if (!walletClient) throw new Error("Turnkey wallet client is unavailable.");
      return walletClient.signTypedData(args as SignTypedDataParameters);
    },
    async sendTransaction(
      args: Omit<SendTransactionParameters, "account" | "chain">,
    ): Promise<Hash> {
      const walletClient = await walletPromise;
      if (!walletClient) throw new Error("Turnkey wallet client is unavailable.");
      return walletClient.sendTransaction(args as SendTransactionParameters);
    },
  };
}
