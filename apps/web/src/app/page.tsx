import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Turnkey + Wagmi + LI.FI</p>
        <h1>
          Embedded session authority for Wagmi that still lets users switch to
          real external wallets.
        </h1>
        <p className="hero-copy">
          This demo keeps Turnkey Embedded Wallet Kit available for embedded
          flows, auto-connects the embedded EVM wallet into Wagmi after auth,
          and still allows any connected third-party wallet to remain the
          active Wagmi wallet when no Turnkey session is present.
        </p>
        <div className="hero-actions">
          <Link href="/widget" className="primary-link">
            Open acceptance demo
          </Link>
          <Link href="/sandbox" className="secondary-link">
            Open direct-action sandbox
          </Link>
        </div>
      </section>

      <section className="grid two-up">
        <article className="panel feature-panel">
          <span className="panel-kicker">/widget</span>
          <h2>LI.FI recognition path</h2>
          <p>
            Verifies that the Turnkey-backed connector shows up as connected in
            the surrounding Wagmi provider and that Reown AppKit can take over
            with an external wallet even if Turnkey is currently signed out.
          </p>
        </article>

        <article className="panel feature-panel">
          <span className="panel-kicker">/sandbox</span>
          <h2>Direct Turnkey signing path</h2>
          <p>
            Uses <code>@turnkey/viem</code> directly for message signing, typed
            data signing, and raw transaction sending against Base Sepolia.
          </p>
        </article>
      </section>
    </main>
  );
}
