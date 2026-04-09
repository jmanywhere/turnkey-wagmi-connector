"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
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
} from "@/lib/app-config";

export function Providers({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
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

  const tkConfig = useMemo(
    () => ({
      ...turnkeyProviderConfig,
      ui: {
        ...turnkeyProviderConfig.ui,
        darkMode: resolvedTheme === "dark",
      },
    }),
    [resolvedTheme],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TurnkeySessionProvider turnkeyConfig={tkConfig}>
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
