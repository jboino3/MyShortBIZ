import { useState } from "react";
import { createLink } from "../api/api";

function LinkCreate() {
  const [slugOption, setSlugOption] = useState("auto");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [utmEnabled, setUtmEnabled] = useState(false);
  const [expirationEnabled, setExpirationEnabled] = useState(false);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");

  const [links, setLinks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await createLink({
        original_url: url,
        destination_summary: title,
        audience: "general",
        tone: "casual",
        goal: "increase clicks",
        platform: "web",
        custom_slug: slugOption === "custom" ? customSlug : "",
      });

      const newLink = {
        id: data.id,
        short: data.short_url,
        original: data.original_url,
        created: new Date().toLocaleDateString(),
        clicks: 0,
        type: "standard",
      };

      setLinks([newLink, ...links]);

      // optional reset
      setUrl("");
      setTitle("");
      setCustomSlug("");
      setSlugOption("auto");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

        {/* Header */}
        <header className="page-header">
          <h2 className="page-title">Create Link</h2>
        </header>

        {/* FORM */}
        <form className="create-link-form" onSubmit={handleSubmit}>

          {/* Basic Information */}
          <section className="form-card">
            <div className="form-card-header">
              <h2 className="card-title">Basic Information</h2>
            </div>

            <div className="form-card-body">

              <label className="form-label">Title (optional)</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <label className="form-label">Link URL</label>
              <input
                type="url"
                className="form-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          </section>

          {/* Slug Options */}
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
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                />
              )}
            </div>
          </section>

          {/* Advanced Options (unchanged UI) */}
          <section className="form-card">
            <div
              className="form-card-header clickable"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <h2 className="card-title">Advanced Options</h2>
              <span className={`arrow ${advancedOpen ? "open" : ""}`}>▾</span>
            </div>

            {advancedOpen && (
              <div className="form-card-body">

                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={utmEnabled}
                    onChange={(e) => setUtmEnabled(e.target.checked)}
                  />
                  <span className="slider"></span>
                  <span className="toggle-label">Enable UTM Parameters</span>
                </label>

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
            )}
          </section>

          {/* Submit */}
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Generating..." : "Shorten Link"}
            </button>
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

        </form>

        {/* LIST OF LINKS */}
        <div className="links-list">
          {filteredLinks.map((link) => (
            <div key={link.id} className="link-card">
              <p><strong>{link.short}</strong></p>
              <p>{link.original}</p>
              <p>{link.created}</p>
            </div>
          ))}
        </div>

      </section>
    </main>
  );
}

export default LinkCreate;