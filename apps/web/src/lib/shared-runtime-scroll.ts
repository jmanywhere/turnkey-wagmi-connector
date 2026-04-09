export const SHARED_RUNTIME_CONNECT_HEADER_ID = "runtime-connect-header";

export function scrollToSharedRuntimeConnectHeader(): void {
  document
    .getElementById(SHARED_RUNTIME_CONNECT_HEADER_ID)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

