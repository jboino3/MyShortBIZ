import "./style.scss";

export default function Features() {
  return (
    <div className="site-page">
      <header className="page-header">
        <p className="pill">Features</p>
        <h1>Everything you need in one creator HQ.</h1>
        <p className="subtitle">
          MyShortBiz replaces the messy mix of link apps, storefronts, and
          spreadsheets with one page that runs your business.
        </p>
      </header>

      <section className="cards-grid">
        <article className="card">
          <h3>Unified link page</h3>
          <p>
            Put your links, products, bookings, and socials into one clean,
            fast-loading page built to convert clicks into customers.
          </p>
        </article>

        <article className="card">
          <h3>Built-in commerce</h3>
          <p>
            Sell digital downloads, memberships, and services with frictionless
            checkout. No custom site or plugins required.
          </p>
        </article>

        <article className="card">
          <h3>Analytics that make sense</h3>
          <p>
            See which links, products, and traffic sources actually drive
            revenue so you know what to double down on.
          </p>
        </article>

        <article className="card">
          <h3>Brand-first customization</h3>
          <p>
            Customize colors, fonts, sections, and layout so your page feels
            like your brand—not another generic bio link.
          </p>
        </article>

        <article className="card">
          <h3>Audience capture</h3>
          <p>
            Collect emails and messages directly from your page and sync them
            into the tools you already use.
          </p>
        </article>

        <article className="card">
          <h3>Creator-friendly controls</h3>
          <p>
            Duplicate pages, test new offers, and update links in seconds—even
            from your phone between posts.
          </p>
        </article>
      </section>
    </div>
  );
}
