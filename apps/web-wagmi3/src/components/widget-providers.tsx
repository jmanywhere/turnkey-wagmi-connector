"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  TurnkeySessionProvider,
  TurnkeyWagmiBridge,
} from "turnkey-wagmi-connector";
import {
  AppKitProvider,
  appKitConfig,
  turnkeyProviderConfig,
  wagmiConfig,
} from "@/lib/widget-app-config";

export function WidgetProviders({
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
          <AppKitProvider {...appKitConfig}>
            <TurnkeyWagmiBridge />
            {children}
          </AppKitProvider>
        </WagmiProvider>
      </TurnkeySessionProvider>
    </QueryClientProvider>
  );
}
