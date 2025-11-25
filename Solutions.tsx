import './solutions.scss';

export default function Solutions() {
  return (
    <main className="solutions-page">
      {/* Hero Menu */}
      <header className="solutions-hero">
        <h1>Solutions for Modern Creators</h1>
        <p>Grow your audience, monetize content, build your brand, and simplify your workflow.</p>
      
      </header>

      {/* Section Cards */}
      <section id="grow-audience" className="solution-section">
        <div className="solution-card">
          <div className="icon-wrapper lavender">📣</div>
          <h2>Grow Your Audience</h2>
          <p>Reach more people and expand your digital presence without the hassle of managing multiple platforms.</p>
          <ul>
            <li>Centralize all your links and content in one place</li>
            <li>Embed videos and forms for better engagement</li>
            <li>Use AI insights to optimize reach</li>
          </ul>
          <a href="#" className="cta-btn">Get Started</a>
        </div>
      </section>

      <section id="monetize-content" className="solution-section">
        <div className="solution-card">
          <div className="icon-wrapper skyblue">💰</div>
          <h2>Monetize Your Content</h2>
          <p>Turn your work into revenue streams easily, without complicated storefronts or technical setups.</p>
          <ul>
            <li>Embed products and shoppable links</li>
            <li>Track campaigns without sacrificing privacy</li>
            <li>Leverage community visibility for sales</li>
          </ul>
          <a href="#" className="cta-btn">Get Started</a>
        </div>
      </section>

      <section id="build-brand" className="solution-section">
        <div className="solution-card">
          <div className="icon-wrapper lavender">🎨</div>
          <h2>Build Your Brand</h2>
          <p>Create a cohesive, recognizable digital identity with professional portfolios, social walls, and custom pages.</p>
          <ul>
            <li>Showcase your work and achievements</li>
            <li>Aggregate social content in one branded feed</li>
            <li>Custom styling options for a consistent look</li>
          </ul>
          <a href="#" className="cta-btn">Get Started</a>
        </div>
      </section>

      <section id="simplify-workflow" className="solution-section">
        <div className="solution-card">
          <div className="icon-wrapper skyblue">⚙️</div>
          <h2>Simplify Your Workflow</h2>
          <p>Automate repetitive tasks, manage content, and maintain consistency without the stress.</p>
          <ul>
            <li>AI-generated blogs and videos</li>
            <li>Easy content repurposing across platforms</li>
            <li>Concierge-style setup if you prefer hands-off onboarding</li>
          </ul>
          <a href="#" className="cta-btn">Get Started</a>
        </div>
      </section>
    </main>
  );
}
