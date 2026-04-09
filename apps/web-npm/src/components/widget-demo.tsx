"use client";

import { useTheme } from "next-themes";
import { LiFiWidget } from "@lifi/widget";
import { useAccount, useConnections } from "wagmi";
import { Button } from "@/components/ui/button";
import { scrollToSharedRuntimeConnectHeader } from "@/lib/shared-runtime-scroll";

export function WidgetDemo() {
    const account = useAccount();
    const connections = useConnections();
    const { resolvedTheme } = useTheme();
    const connectedAddress = account.isConnected ? account.address : undefined;
    const activeConnector = connections.at(0)?.connector;
    const lifiWidgetKey = `${connectedAddress ?? "disconnected"}:${String(
        account.chainId ?? "no-chain",
    )}:${activeConnector?.id ?? "none"}`;

    const isDark = resolvedTheme === "dark";

    return (
        <div className="w-full">
            {connectedAddress ? (
                <div className="widget-wrap min-h-[480px] w-full">
                    <LiFiWidget
                        key={lifiWidgetKey}
                        integrator="vudy-app"
                        config={{
                            appearance: isDark ? "dark" : "light",
                            variant: "compact",
                            theme: {
                                palette: {
                                    primary: {
                                        main: isDark ? "#e0e0e0" : "#111111",
                                    },
                                    secondary: {
                                        main: isDark ? "#8a8e88" : "#4a4f48",
                                    },
                                    background: {
                                        default: isDark ? "#1a1a2e" : "#f7f7f5",
                                        paper: isDark ? "#222238" : "#ffffff",
                                    },
                                    text: {
                                        primary: isDark ? "#e0e0e0" : "#111111",
                                        secondary: isDark
                                            ? "#9a9a9a"
                                            : "#666666",
                                    },
                                },
                                shape: {
                                    borderRadius: 14,
                                    borderRadiusSecondary: 14,
                                },
                            },
                        }}
                    />
                </div>
            ) : (
                <div className="flex min-h-60 w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-4 py-8 text-center">
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
            )}
        </div>
    );
}
