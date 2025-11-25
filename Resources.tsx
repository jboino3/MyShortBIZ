import './resources.scss';

export default function Resources() {
  return (
    <main className="resources-page">
      <header className="resources-hero">
        <h1>Resources</h1>
        <p>Your central hub for guides, templates, and tutorials.</p>
      </header>

      <div className="resources-row">
        <section className="resources-section">
          <h2>📘 Getting Started</h2>
          <ul>
            <li><a href="#">Introduction & Setup</a></li>
            <li><a href="#">First Steps Guide</a></li>
            <li><a href="#">Overview of Features</a></li>
          </ul>
        </section>

        <section className="resources-section">
          <h2>🎓 Tutorials & Guides</h2>
          <ul>
            <li><a href="#">Creating Your First Link Page</a></li>
            <li><a href="#">Publishing Your First Video</a></li>
            <li><a href="#">Building Your Digital Portfolio</a></li>
          </ul>
        </section>

        <section className="resources-section">
          <h2>📂 Templates & Examples</h2>
          <ul>
            <li><a href="#">Link Page Template</a></li>
            <li><a href="#">Shoppable Page Example</a></li>
            <li><a href="#">Portfolio Layout Example</a></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
