"use client";

import { useId, useState } from "react";
import { baseSepolia } from "viem/chains";
import { parseEther } from "viem";
import {
  useAccount,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CopyBlock } from "@/components/copy-block";
import { WagmiChainSwitchSignCard } from "@/components/wagmi-chain-switch-sign-card";
import { scrollToSharedRuntimeConnectHeader } from "@/lib/shared-runtime-scroll";

export function SandboxDemo() {
  const fieldId = useId();
  const sendToId = `${fieldId}-send-to`;
  const amountId = `${fieldId}-send-amount`;
  const account = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, isPending: isSendPending } =
    useSendTransaction();
  const [transactionHash, setTransactionHash] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [amount, setAmount] = useState("0");
  const [error, setError] = useState("");

  const targetAddress = sendTo || account.address || "";
  const onCorrectChain = account.chainId === baseSepolia.id;

  return (
    <div className="grid gap-6">
      <WagmiChainSwitchSignCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Base Sepolia Transfer</CardTitle>
          <CardDescription>
            Sends native ETH through the active Wagmi wallet on Base Sepolia
            (chain {baseSepolia.id}). Switches network automatically when needed;
            the wallet needs enough Sepolia ETH for gas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="field">
            <label htmlFor={sendToId}>Recipient</label>
            <input
              id={sendToId}
              onChange={(event) => setSendTo(event.target.value)}
              placeholder="0x..."
              value={sendTo}
            />
          </div>

          <div className="field">
            <label htmlFor={amountId}>Value in ETH</label>
            <input
              id={amountId}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.0001"
              value={amount}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!account.isConnected || onCorrectChain}
              onClick={() => {
                void switchChainAsync({ chainId: baseSepolia.id })
                  .then(() => setError(""))
                  .catch((cause: unknown) => {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Chain switch failed.",
                    );
                  });
              }}
              type="button"
              className="w-fit"
            >
              Switch to Base Sepolia
            </Button>
            <Button
              disabled={
                !account.isConnected ||
                !account.address ||
                !targetAddress ||
                isSendPending
              }
              onClick={async () => {
                if (!account.address) {
                  return;
                }
                try {
                  setError("");
                  if (account.chainId !== baseSepolia.id) {
                    await switchChainAsync({ chainId: baseSepolia.id });
                  }
                  const hash = await sendTransactionAsync({
                    chainId: baseSepolia.id,
                    to: targetAddress as `0x${string}`,
                    value: parseEther(amount || "0"),
                  });
                  setTransactionHash(hash);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Transaction submission failed.",
                  );
                }
              }}
              type="button"
              className="w-fit"
            >
              {isSendPending ? "Sending…" : "Send transaction"}
            </Button>
          </div>

          {!account.isConnected ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Connect a wallet from the shared runtime first.
              </p>
              <Button
                onClick={() => scrollToSharedRuntimeConnectHeader()}
                type="button"
                variant="secondary"
              >
                Go to connect
              </Button>
            </div>
          ) : null}

          {transactionHash ? (
            <CopyBlock label="Transaction hash" value={transactionHash} />
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
