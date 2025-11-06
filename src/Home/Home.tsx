// src/Home/Home.tsx
import "./style.scss";

export default function Home() {
  return (
    <main className="home">
      {/* Hero */}
      <section className="home__hero">
        <div className="container">
          <h1>
            Create, sell, and grow <span className="accent">faster</span> on MyShort.biz
          </h1>
          <p className="sub">
            A creator toolkit to launch pages, sell digital goods, and connect with fans—without the busywork.
          </p>
          <div className="cta-row">
            <a className="btn btn--primary" href="#get-started">Get Started</a>
            <a className="btn btn--ghost" href="#learn-more">Learn More</a>
          </div>
        </div>
        <div className="hero-bg"></div>
      </section>

      {/* Social proof */}
      <section className="home__logos">
        <div className="container">
          <span className="eyebrow">Trusted by creators</span>
          <div className="logo-row">
            <div className="logo-skeleton">Logo</div>
            <div className="logo-skeleton">Logo</div>
            <div className="logo-skeleton">Logo</div>
            <div className="logo-skeleton">Logo</div>
            <div className="logo-skeleton">Logo</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="home__features" id="learn-more">
        <div className="container">
          <h2>Everything you need to launch</h2>
          <p className="sub">Beautiful pages, built-in commerce, analytics, and integrations.</p>
          <div className="grid">
            <article className="card">
              <div className="icon">🧩</div>
              <h3>Drag-and-drop Pages</h3>
              <p>Launch link-in-bio, landing pages, or full sites in minutes with polished blocks.</p>
            </article>
            <article className="card">
              <div className="icon">💳</div>
              <h3>Sell Digital Goods</h3>
              <p>Drop in products, coupons, and instant checkout—no plugins or code.</p>
            </article>
            <article className="card">
              <div className="icon">📈</div>
              <h3>Analytics that Guide</h3>
              <p>Understand traffic, conversions, and top content at a glance.</p>
            </article>
            <article className="card">
              <div className="icon">⚡</div>
              <h3>Fast by Default</h3>
              <p>Optimized assets, CDN delivery, and best practices out of the box.</p>
            </article>
            <article className="card">
              <div className="icon">🔌</div>
              <h3>Integrations</h3>
              <p>Connect socials, email, and payment tools you already use.</p>
            </article>
            <article className="card">
              <div className="icon">🛡️</div>
              <h3>Secure & Reliable</h3>
              <p>Modern security, sensible defaults, and uptime you can count on.</p>
            </article>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="home__steps">
        <div className="container">
          <h2>How it works</h2>
          <ol className="steps">
            <li>
              <span className="num">1</span>
              <div>
                <h4>Create your page</h4>
                <p>Pick a template and customize blocks—no code needed.</p>
              </div>
            </li>
            <li>
              <span className="num">2</span>
              <div>
                <h4>Add products & links</h4>
                <p>List digital goods, services, and your important links.</p>
              </div>
            </li>
            <li>
              <span className="num">3</span>
              <div>
                <h4>Share & grow</h4>
                <p>Go live, track performance, and iterate quickly.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Testimonial */}
      <section className="home__quote">
        <div className="container">
          <blockquote>
            “MyShort.biz helped me launch a paid product in a weekend. It’s the
            first time my site felt this fast and clean.”
          </blockquote>
          <div className="cite">— A happy creator</div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="home__cta" id="get-started">
        <div className="container">
          <h2>Ready to build your next drop?</h2>
          <p className="sub">Start free. Upgrade only when you’re winning.</p>
          <a className="btn btn--primary" href="/#/creator">Open Creator Home</a>
        </div>
      </section>
    </main>
  );
}
