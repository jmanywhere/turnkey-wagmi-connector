import { WalletSource, type EmbeddedWallet, type Wallet, type WalletAccount } from "@turnkey/core";
import type { TurnkeyEmbeddedEvmAccount } from "../types/runtime";

const EVM_CURVE = "CURVE_SECP256K1";
const EVM_ADDRESS_FORMAT = "ADDRESS_FORMAT_ETHEREUM";

function isEvmAccount(account: WalletAccount) {
  const maybeAddress = account.address?.toLowerCase();
  const maybeConnectedChain =
    "chainInfo" in account && account.chainInfo
      ? (account.chainInfo as { namespace?: string })
      : undefined;

  return (
    typeof maybeAddress === "string" &&
    maybeAddress.startsWith("0x") &&
    (account.curve === EVM_CURVE ||
      account.addressFormat === EVM_ADDRESS_FORMAT ||
      maybeConnectedChain?.namespace === "ethereum")
  );
}

export function resolveEmbeddedEvmAccount(
  wallets: Wallet[],
): TurnkeyEmbeddedEvmAccount | undefined {
  for (const wallet of wallets) {
    if (wallet.source !== WalletSource.Embedded) continue;

    const account = (wallet as EmbeddedWallet).accounts.find(isEvmAccount);
    if (!account?.address) continue;

    return {
      address: account.address as `0x${string}`,
      walletId: account.walletId,
      walletAccountId: account.walletAccountId,
      wallet,
      account,
    };
  }

  return undefined;
}
