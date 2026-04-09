import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Turnkey + Wagmi + LI.FI + npm</p>
        <h1>
          Published-package fixture for Turnkey session authority in Wagmi.
        </h1>
        <p className="hero-copy">
          This app installs <code>turnkey-wagmi-connector</code> from npm
          instead of the local workspace package, while keeping the same Wagmi
          2, Reown AppKit, and LI.FI acceptance flows as the source fixture.
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
          <h2>Registry-installed connector path</h2>
          <p>
            Verifies that the published connector package shows up as connected
            in Wagmi and still hands off correctly to Reown AppKit and LI.FI.
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
