import "./styles.scss";

export default function About() {
  return (
    <main className="page">
      <div className="page-inner">
        <section className="page-card about-page">
          <header className="page-header">
            <span className="page-pill">About MyShortBiz</span>
            <h1>We&apos;re building the HQ for short-form creators.</h1>
            <p className="subtitle">
              MyShortBiz exists so creators, studios, and entrepreneurs can
              turn attention into a real business — without duct-taping five
              different tools together or getting lost in tech.
            </p>
          </header>
          <section className="page-section about-grid">
            <div className="about-copy">
              <h2>What we believe in</h2>
              <ul>
                <li>
                  <strong>Simplicity:</strong> Your link-in-bio, offers, and
                  client flows should live in one clear place — not across ten tabs.
                </li>
                <li>
                  <strong>Speed:</strong> You should be able to launch a new
                  drop, package, or service in minutes, not days.
                </li>
                <li>
                  <strong>Creativity:</strong> Tools shouldn&apos;t box you in.
                  Your brand, your layout, your way of working.
                </li>
                <li>
                  <strong>Data with context:</strong> Numbers only matter if
                  they tell you what to do next.
                </li>
              </ul>

              <h2>Our story</h2>
              <p>
                MyShortBiz started as a frustration: creators were sending fans
                to half-working link pages, patchwork Notion docs, and random
                payment links. Nothing felt like a true &quot;home base&quot;
                for their brand.
              </p>
              <p>
                We teamed up — engineers, designers, and creators — to build a
                focused toolkit: one place to route traffic, sell offers, and
                understand what&apos;s actually working. No coding, no bloated
                dashboards, no &quot;enterprise&quot; nonsense.
              </p>
            </div>

            <aside className="about-highlight">
              <h2>Plays nicely with your stack</h2>
              <p>
                MyShortBiz is designed to sit at the center of your creator
                workflow — the page you link everywhere and update in seconds.
              </p>
              <div className="logo-row">
                <span className="logo-pill">TikTok</span>
                <span className="logo-pill">Instagram</span>
                <span className="logo-pill">YouTube</span>
                <span className="logo-pill">Twitch</span>
                <span className="logo-pill">Calendly</span>
                <span className="logo-pill">Stripe</span>
                <span className="logo-pill">Shopify</span>
              </div>
            </aside>
          </section>

          <section className="page-section">
            <div className="about-metrics">
              <div className="metric-card">
                <div className="metric-number">10x</div>
                <div className="metric-label">FASTER LAUNCH</div>
                <p className="metric-text">
                  Creators launch new pages, offers, or drops in minutes
                  instead of rebuilding full sites.
                </p>
              </div>
              <div className="metric-card">
                <div className="metric-number">+35%</div>
                <div className="metric-label">MORE CLICKS TO OFFERS</div>
                <p className="metric-text">
                  Cleaner layouts and smart link routing help more fans reach
                  the things that actually drive revenue.
                </p>
              </div>
              <div className="metric-card">
                <div className="metric-number">Global</div>
                <div className="metric-label">CREATOR-FIRST FOCUS</div>
                <p className="metric-text">
                  Built with input from creators, editors, and studios working
                  across timezones and platforms.
                </p>
              </div>
            </div>
          </section>

          {/* Simple timeline / roadmap feel */}
          <section className="page-section about-timeline">
            <h2>How we&apos;re evolving</h2>
            <ul className="timeline-list">
              <li className="timeline-item">
                <span className="timeline-year">2025 November</span>
                <span className="timeline-text">
                  Early prototypes focused on solving a single problem:
                  turning link-in-bio clicks into predictable revenue.
                </span>
              </li>
              <li className="timeline-item">
                <span className="timeline-year">2025 November</span>
                <span className="timeline-text">
                  We rolled out analytics, product blocks, and creator-focused
                  customization so your page feels like your brand.
                </span>
              </li>
              <li className="timeline-item">
                <span className="timeline-year">2025 November</span>
                <span className="timeline-text">
                  Next up: deeper integrations, smarter insights based on real
                  creator data, and templates tailored to different business
                  models — from coaching to content studios.
                </span>
              </li>
            </ul>
          </section>
        </section>
      </div>
    </main>
  );
}
