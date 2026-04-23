import { useEffect, useState } from "react";
import { createLink, getMyLinks } from "../api/api";
import { Link } from "react-router-dom";
import "./style.scss";

const API_BASE = import.meta.env.VITE_API_URL;

function Home() {
  const [url, setUrl] = useState("");
  const [recentLinks, setRecentLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch recent links
  const fetchRecentLinks = async () => {
    try {
      const data = await getMyLinks();

      const linksArray =
        Array.isArray(data)
          ? data
          : data.links || data.data || [];

      setRecentLinks(linksArray);
    } catch (err) {
      console.error(err);
      setRecentLinks([]);
    }
  };

  useEffect(() => {
    fetchRecentLinks();
  }, []);

  // Create short link
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createLink({ original_url: url });
      setUrl("");
      fetchRecentLinks();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="home-page-layout">
      <h1>Home</h1>

      {/* QUICK CREATE */}
      <section className="quick-actions-card">
        <div className="create-quick-link-card">
          <h2>Quick Create Link</h2>
          <p>Enter a website url to create a shortened link</p>

          <form className="quick-create-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="www.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Shorten Link"}
            </button>
          </form>
        </div>
      </section>

      {/* RECENT LINKS (simple + clean) */}
      <section className="recents-section">
        <div className="recents-card">
          <h2>Recent Links</h2>

          {recentLinks.length === 0 ? (
            <p>No links yet.</p>
          ) : (
            <div className="recent-list">
              {recentLinks.slice(0, 5).map((link) => {
                const shortUrl = `${API_BASE}/r/${link.short_code}`;

                return (
                  <div key={link.id} className="recent-item">

                    {/* Short link */}
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="short-link"
                    >
                      {shortUrl}
                    </a>

                    {/* Original link */}
                    <a
                      href={link.original_url}
                      target="_blank"
                      rel="noreferrer"
                      className="original-link"
                    >
                      {link.original_url}
                    </a>

                  </div>
                );
              })}
            </div>
          )}

          {/* Optional: View all */}
          <div style={{ marginTop: "1rem" }}>
            <Link to="/link/links">View all links →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;