import "./style.scss";

export default function Solutions() {
  return (
    <div className="site-page">
      <header className="page-header">
        <p className="pill">Solutions</p>
        <h1>Built for the way modern creators actually work.</h1>
        <p className="subtitle">
          Whether you’re a creator, coach, or small studio, MyShortBiz gives
          you a simple system to turn reach into revenue.
        </p>
      </header>

      <section className="two-column">
        <div className="column">
          <h2>Content creators & influencers</h2>
          <ul className="bullet-list">
            <li>Turn “link in bio” into a branded mini-site.</li>
            <li>Highlight sponsors, launches, and limited offers.</li>
            <li>Route fans to the right place in one tap.</li>
          </ul>
        </div>

        <div className="column">
          <h2>Coaches, freelancers, & studios</h2>
          <ul className="bullet-list">
            <li>Showcase services, portfolios, and case studies.</li>
            <li>Embed booking flows or link to your calendar.</li>
            <li>Collect payments and client details in one place.</li>
          </ul>
        </div>
      </section>

      <section className="cards-grid">
        <article className="card">
          <h3>Launch pages</h3>
          <p>
            Spin up focused pages for product drops, campaigns, or partner
            collabs without touching a full website.
          </p>
        </article>

        <article className="card">
          <h3>Always-on home base</h3>
          <p>
            Keep one evergreen page that aggregates everything you do—perfect
            for bios, QR codes, and profiles.
          </p>
        </article>

        <article className="card">
          <h3>Client-friendly handoff</h3>
          <p>
            Agencies and editors can build pages for clients, then hand over
            a login so they can self-manage.
          </p>
        </article>
      </section>
    </div>
  );
}
