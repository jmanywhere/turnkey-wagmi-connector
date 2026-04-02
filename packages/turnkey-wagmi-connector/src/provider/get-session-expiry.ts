import type { Session } from "@turnkey/sdk-types";

/**
 * Converts the Turnkey session expiry, which is expressed in Unix seconds,
 * into a JavaScript timestamp in milliseconds.
 */
export function getTurnkeySessionExpiryTimestamp(session?: Session): number | undefined {
  return session?.expiry ? Number(session.expiry) * 1000 : undefined;
}
