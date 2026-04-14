import { useState } from "react";

function LinkCreate() {
  const [slugOption, setSlugOption] = useState("auto");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [utmEnabled, setUtmEnabled] = useState(false);
  const [expirationEnabled, setExpirationEnabled] = useState(false);

  const [links, setLinks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const createLink = () => {

  const id = crypto.randomUUID().slice(0,6);

  const newLink = {
    id,
    short: `myshort.link/${id}`,
    original: "https://example.com",
    created: new Date().toLocaleDateString(),
    clicks: Math.floor(Math.random()*50),
    type: "standard"
  };

  setLinks([newLink, ...links]);
};

  const filteredLinks = links.filter((link) => {

  const matchesSearch =
    link.short.toLowerCase().includes(search.toLowerCase()) ||
    link.original.toLowerCase().includes(search.toLowerCase());

  const matchesFilter =
    filterType === "all" || link.type === filterType;

  return matchesSearch && matchesFilter;

});

  return (
    <main className="link-page-layout">
   
      <section className="create-link-container">
          {/* Page Header */}
          <header className="page-header">
            <h2 className="page-title">Create Link</h2>
          </header>

          {/* Form */}
          <form className="create-link-form">
            
            {/* -------- Basic Information Card -------- */}
            <section className="form-card">
              <div className="form-card-header">
                <h2 className="card-title">Basic Information</h2>
              </div>

              <div className="form-card-body">
                <label htmlFor="title" className="form-label">
                  Title (optional)
                </label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  placeholder="Enter a title"
                />

                <label htmlFor="url" className="form-label">
                  Link URL
                </label>
                <input
                  id="url"
                  type="url"
                  className="form-input"
                  placeholder="https://www.example.com"
                  required
                />
              </div>
            </section>

            {/* -------- Link Ending Card -------- */}
            <section className="form-card">
              <div className="form-card-header">
                <h2 className="card-title">Slug Ending</h2>
              </div>

              <div className="form-card-body">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="slug"
                    value="auto"
                    checked={slugOption === "auto"}
                    onChange={() => setSlugOption("auto")}
                  />
                  Automatically generate (free)
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="slug"
                    value="ai"
                    checked={slugOption === "ai"}
                    onChange={() => setSlugOption("ai")}
                  />
                  Generate with AI (1 token)
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="slug"
                    value="custom"
                    checked={slugOption === "custom"}
                    onChange={() => setSlugOption("custom")}
                  />
                  Enter my own ending
                </label>

                {slugOption === "custom" && (
                  <input
                    type="text"
                    className="form-input small-input"
                    placeholder="summer-sale"
                  />
                )}
              </div>
            </section>

            {/* -------- Advanced Options Card -------- */}
            <section className="form-card">
              <div
                className="form-card-header clickable"
                onClick={() => setAdvancedOpen(!advancedOpen)}
              >
                <h2 className="card-title">Advanced Options</h2>
                <span className={`arrow ${advancedOpen ? "open" : ""}`}>
                  ▾
                </span>
              </div>

              {advancedOpen && (
                <div className="form-card-body">

                  {/* UTM Toggle */}
                  <div className="toggle-row">
                    <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={utmEnabled}
                      onChange={(e) => setUtmEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                    <span className="toggle-label">Enable UTM Parameters</span>
                  </label>
                  </div>

                  {utmEnabled && (
                    <div className="nested-section">
                      <label className="form-label">Source</label>
                      <input type="text" className="form-input" />

                      <label className="form-label">Medium</label>
                      <input type="text" className="form-input" />

                      <label className="form-label">Campaign</label>
                      <input type="text" className="form-input" />

                      <label className="form-label">Term (optional)</label>
                      <input type="text" className="form-input" />

                      <label className="form-label">Content (optional)</label>
                      <input type="text" className="form-input" />
                    </div>
                  )}

                  {/* Expiration Toggle */}
                  <div className="toggle-row">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={expirationEnabled}
                        onChange={(e) => setExpirationEnabled(e.target.checked)}
                      />
                      <span className="slider"></span>
                      <span className="toggle-label">Enable Expiration</span>
                    </label>
                  </div>

                  {expirationEnabled && (
                    <div className="nested-section">
                      <label className="form-label">
                        Expiration Duration
                      </label>
                      <select className="form-select">
                        <option>Never</option>
                        <option>1 Day</option>
                        <option>7 Days</option>
                        <option>30 Days</option>
                        <option>90 Days</option>
                        <option>Custom Date</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Submit */}
            <div className="form-actions">
              <button type="submit" className="primary-button">
                Shorten Link
              </button>
            </div>

          </form>
        </section>
      
      
    </main>
  )
}

export default LinkCreate
