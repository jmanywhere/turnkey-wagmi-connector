"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  TurnkeySessionProvider,
  TurnkeyWagmiBridge,
} from "turnkey-wagmi-connector";
import { turnkeyProviderConfig, wagmiConfig } from "@/lib/plain-app-config";

export function PlainProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TurnkeySessionProvider turnkeyConfig={turnkeyProviderConfig}>
        <WagmiProvider config={wagmiConfig}>
          <TurnkeyWagmiBridge />
          {children}
        </WagmiProvider>
      </TurnkeySessionProvider>
    </QueryClientProvider>
  );
}
