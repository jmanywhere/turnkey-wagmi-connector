import { WalletSource, type EmbeddedWallet, type Wallet, type WalletAccount } from "@turnkey/core";

const EVM_CURVE = "CURVE_SECP256K1";
const EVM_ADDRESS_FORMAT = "ADDRESS_FORMAT_ETHEREUM";

function isEvmAccount(account: WalletAccount) {
  const maybeChain =
    "chainInfo" in account && account.chainInfo
      ? (account.chainInfo as { namespace?: string })
      : undefined;

  return (
    typeof account.address === "string" &&
    account.address.startsWith("0x") &&
    (account.curve === EVM_CURVE ||
      account.addressFormat === EVM_ADDRESS_FORMAT ||
      maybeChain?.namespace === "ethereum")
  );
}

export function resolveEmbeddedAccount(wallets: Wallet[]) {
  for (const wallet of wallets) {
    if (wallet.source !== WalletSource.Embedded) continue;

    const account = (wallet as EmbeddedWallet).accounts.find(isEvmAccount);
    if (account?.address) return account;
  }

  return undefined;
}
