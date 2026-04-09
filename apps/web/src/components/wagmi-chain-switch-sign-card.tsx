"use client";

import { useEffect, useRef, useState } from "react";
import { verifyMessage } from "viem";
import { useAccount, useConnections, useSignMessage } from "wagmi";
import {
  useTurnkeyChainSwitch,
  useTurnkeySessionGate,
} from "turnkey-wagmi-connector";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CopyBlock } from "@/components/copy-block";
import { wagmiConfig } from "@/lib/app-config";

const chainButtons = [
  { id: 8453, label: "Base" },
  { id: 42161, label: "Arbitrum" },
  { id: 10, label: "Optimism" },
] as const;

export function WagmiChainSwitchSignCard() {
  const sessionGate = useTurnkeySessionGate();
  const { switchChain } = useTurnkeyChainSwitch(wagmiConfig);
  const account = useAccount();
  const connections = useConnections();
  const { signMessageAsync } = useSignMessage();
  const [signedMessage, setSignedMessage] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [verificationOk, setVerificationOk] = useState<boolean | null>(null);
  const [verifyDetail, setVerifyDetail] = useState<string>("");
  const [error, setError] = useState<string>("");

  const activeConnector = connections.at(0)?.connector;

  const preSignAddressRef = useRef<typeof account.address>(undefined);
  useEffect(() => {
    if (preSignAddressRef.current === account.address) {
      return;
    }
    preSignAddressRef.current = account.address;
    setSignedMessage("");
    setSignature("");
    setVerificationOk(null);
    setVerifyDetail("");
  }, [account.address]);

  const walletDescription =
    activeConnector?.id === "turnkey"
      ? "If Turnkey is selected, signatures come from the embedded wallet."
      : "If a third-party wallet is selected, Wagmi should keep using it even while Turnkey is logged out.";
  const sessionNotice =
    sessionGate.authState === "unauthenticated" && account.isConnected
      ? "Turnkey is logged out. The current Wagmi wallet should stay connected and usable."
      : null;
  const reconnectNotice = sessionGate.reconnectRequired
    ? `Turnkey session is unavailable. Turnkey-backed actions stay paused until you reconnect.${sessionGate.lastError ? ` Reason: ${sessionGate.lastError}` : ""}`
    : null;
  const connectorNotice = sessionGate.connectorError
    ? `Turnkey connector could not finish connecting. The Turnkey session is still active, but RPC-backed connector actions stay paused until the transport recovers or you reconnect. Reason: ${sessionGate.connectorError}`
    : null;

  const verifyLocalSignature = async (
    message: string,
    sig: `0x${string}`,
    address: `0x${string}`,
  ) => {
    try {
      const ok = await verifyMessage({
        address,
        message,
        signature: sig,
      });
      setVerificationOk(ok);
      setVerifyDetail(
        ok
          ? "EIP-191 personal_sign: recovered signer matches the connected address (viem verifyMessage)."
          : "Recovered signer does not match the connected address.",
      );
    } catch (cause) {
      setVerificationOk(false);
      setVerifyDetail(
        cause instanceof Error ? cause.message : "Verification failed.",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Wagmi Chain Switch + Sign</CardTitle>
        <CardDescription>
          Switch chains and sign through the current Wagmi connector.{" "}
          {walletDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {sessionNotice ? (
          <Alert>
            <AlertDescription>{sessionNotice}</AlertDescription>
          </Alert>
        ) : null}

        {reconnectNotice ? (
          <Alert variant="destructive">
            <AlertDescription>{reconnectNotice}</AlertDescription>
          </Alert>
        ) : null}

        {connectorNotice ? (
          <Alert>
            <AlertDescription>{connectorNotice}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {chainButtons.map((chain) => (
            <Button
              key={chain.id}
              variant="secondary"
              size="sm"
              disabled={account.chainId === chain.id}
              onClick={() => {
                void switchChain(chain.id)
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
            >
              {chain.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Chain: {account.chainId ?? "n/a"}</Badge>
          <Badge variant="outline" className="max-w-full truncate">
            {account.address ?? "connect from shared runtime"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={!account.isConnected || !account.address}
            onClick={async () => {
              if (!account.address) {
                return;
              }
              try {
                setError("");
                const message = `Turnkey widget demo :: ${new Date().toISOString()}`;
                const result = await signMessageAsync({ message });
                setSignedMessage(message);
                setSignature(result);
                await verifyLocalSignature(
                  message,
                  result as `0x${string}`,
                  account.address,
                );
              } catch (cause) {
                setSignedMessage("");
                setSignature("");
                setVerificationOk(null);
                setVerifyDetail("");
                setError(
                  cause instanceof Error ? cause.message : "Signing failed.",
                );
              }
            }}
            type="button"
            className="w-fit"
          >
            Sign via Wagmi
          </Button>
          <Button
            disabled={!signedMessage || !signature || !account.address}
            onClick={() => {
              if (!account.address || !signedMessage || !signature) {
                return;
              }
              void verifyLocalSignature(
                signedMessage,
                signature as `0x${string}`,
                account.address,
              );
            }}
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
          >
            Re-verify locally
          </Button>
          <Button variant="outline" size="sm" className="w-fit" asChild>
            <a
              href="https://etherscan.io/verifiedSignatures#"
              rel="noopener noreferrer"
              target="_blank"
            >
              Verify on Etherscan
            </a>
          </Button>
        </div>

        {signedMessage ? (
          <CopyBlock label="Signed message" value={signedMessage} />
        ) : null}
        {signature ? <CopyBlock label="Signature" value={signature} /> : null}
        {verificationOk !== null ? (
          <Alert
            className={
              verificationOk
                ? "border-emerald-500/40 bg-emerald-500/5"
                : undefined
            }
            variant={verificationOk ? "default" : "destructive"}
          >
            <AlertDescription>
              {verificationOk
                ? "Signature is valid for this address."
                : "Signature verification failed."}{" "}
              {verifyDetail}
            </AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

