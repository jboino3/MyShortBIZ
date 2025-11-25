import React, { useEffect } from "react";
import "./style.scss";

export default function Home() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    if (!("IntersectionObserver" in window) || elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <main className="home">
      <section className="home__hero reveal reveal-up">
        <div className="container">
          <h1>
            Build your creator <span className="accent">business</span> in one place.
          </h1>
          <p className="sub">
            MyShort.biz gives creators a fast, intuitive HQ to launch pages, sell products,
            and turn reach into revenue—without juggling five different tools.
          </p>

          <div className="cta-row">
            <a className="btn btn--primary" href="#get-started">
              Start free
            </a>
            <a className="btn btn--ghost" href="#learn-more">
              See how it works
            </a>
          </div>
        </div>

        <div className="hero-bg hero-bg--ripple" />
      </section>

      <section className="home__highlight reveal reveal-up">
        <div className="container">
          <h3>Your entire toolkit. One HQ.</h3>
          <p>
            No plugins. No clunky dashboards. Everything you need to launch, grow, and scale—
            built for speed and short-form attention spans.
          </p>

          <div className="highlight-grid">
            <div className="highlight-card">
               <span>Lightning-fast pages tuned for mobile and swipe culture.</span>
            </div>
            <div className="highlight-card">
               <span>Built-in commerce so you can sell without leaving your page.</span>
            </div>
            <div className="highlight-card">
               <span>Clean analytics that show you exactly what works.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home__features" id="learn-more">
        <div className="container reveal reveal-up">
          <h2>Everything you need to launch</h2>
          <p className="sub">
            Pages, products, analytics, and workflows—built for creators, not corporations.
          </p>

          <div className="grid">
            <article className="card reveal reveal-up">
              <div className="icon"></div>
              <h3>Drag-and-drop pages</h3>
              <p>Launch link hubs, drops, or full microsites in minutes using polished blocks.</p>
            </article>

            <article className="card reveal reveal-up">
              <div className="icon"></div>
              <h3>Sell digital goods</h3>
              <p>Presets, guides, memberships, coaching—if it’s digital, you can ship it.</p>
            </article>

            <article className="card reveal reveal-up">
              <div className="icon"></div>
              <h3>Analytics that guide</h3>
              <p>See where traffic comes from, what converts, and what to double down on.</p>
            </article>

            <article className="card reveal reveal-up">
              <div className="icon"></div>
              <h3>Fast by default</h3>
              <p>Optimized performance so fans never bounce on a slow loading page again.</p>
            </article>

            <article className="card reveal reveal-up">
              <div className="icon"></div>
              <h3>Smart integrations</h3>
              <p>Connect socials, email tools, and payment providers you already rely on.</p>
            </article>

            <article className="card reveal reveal-up">
              <div className="icon"></div>
              <h3>Secure & reliable</h3>
              <p>Modern security and uptime that keeps your business always-on.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="home__why">
        <div className="container reveal reveal-up">
          <h2>Why creators choose MyShort.biz</h2>

          <div className="why-grid">
            <div className="why-card">
              <h3>Zero setup headaches</h3>
              <p>
                Skip the developer, plugins, and patchwork dashboards. Open, customize, publish.
              </p>
            </div>

            <div className="why-card">
              <h3>Your brand first</h3>
              <p>
                Typography, colors, sections, and layout that feel like *you*, not a template.
              </p>
            </div>

            <div className="why-card">
              <h3>Built for short-form</h3>
              <p>
                Optimized for link-in-bio, QR codes, and swipe-up flows so every visit counts.
              </p>
            </div>

            <div className="why-card">
              <h3>Grows with you</h3>
              <p>
                Start with a simple page, then layer on offers, funnels, and client flows as you scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home__steps">
        <div className="container reveal reveal-up">
          <h2>How it works</h2>
          <ol className="steps">
            <li>
              <span className="num">1</span>
              <div>
                <h4>Create your page</h4>
                <p>Select a layout, plug in your content, and style it in minutes.</p>
              </div>
            </li>

            <li>
              <span className="num">2</span>
              <div>
                <h4>Add products & links</h4>
                <p>Drop in digital goods, services, and your most important links.</p>
              </div>
            </li>

            <li>
              <span className="num">3</span>
              <div>
                <h4>Share & grow</h4>
                <p>Share your page everywhere, then use analytics to iterate quickly.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="home__quote">
        <div className="container reveal reveal-up">
          <blockquote>
            “MyShort.biz helped me launch my first paid product in a weekend and connect it to all platforms.
            The whole experience finally feels like my brand.”
          </blockquote>
          <div className="cite">— A creator who finally leveled up</div>
        </div>
      </section>

      <section className="home__cta" id="get-started">
        <div className="container reveal reveal-up">
          <h2>Ready to build your next drop?</h2>
          <p className="sub">Start free. Upgrade only when you’re winning.</p>
          <a className="btn btn--primary" href="/#/creator">
            Open Creator HQ
          </a>
        </div>
      </section>
    </main>
  );
}
