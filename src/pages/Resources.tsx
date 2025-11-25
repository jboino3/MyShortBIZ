import "./style.scss";

export default function Resources() {
  return (
    <div className="site-page">
      <header className="page-header">
        <p className="pill">Resources</p>
        <h1>Playbooks, templates, and help — all in one place.</h1>
        <p className="subtitle">
          Learn how top creators structure their pages, launch offers, and
          turn casual clicks into loyal customers.
        </p>
      </header>

      <section className="cards-grid">
        <article className="card">
          <h3>Launch page checklist</h3>
          <p>
            A step-by-step guide to setting up a high-converting launch page for
            your next product drop or campaign.
          </p>
        </article>

        <article className="card">
          <h3>Creator page templates</h3>
          <p>
            Pre-built layouts for podcasters, streamers, coaches, and studios so
            you never start from a blank screen.
          </p>
        </article>

        <article className="card">
          <h3>Best-practice library</h3>
          <p>
            Short lessons on pricing, offers, and positioning to help you turn
            attention into predictable revenue.
          </p>
        </article>

        <article className="card">
          <h3>Help center</h3>
          <p>
            Step-by-step docs that walk through setup, integrations, and
            advanced features at your own pace.
          </p>
        </article>

        <article className="card">
          <h3>Changelog & roadmap</h3>
          <p>
            See what’s new, what’s shipping next, and how we’re building tools
            around real creator workflows.
          </p>
        </article>

        <article className="card">
          <h3>Support when you need it</h3>
          <p>
            Reach out for help or feedback and we’ll respond with real,
            actionable answers — not generic macros.
          </p>
        </article>
      </section>
    </div>
  );
}
