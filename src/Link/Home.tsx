import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;
import {createLink, getMyLinks } from "../api/api";

function Home() {
  const [url, setUrl] = useState("");
  const [recentLinks, setRecentLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentLinks = async () =>{
    try{
      const data = await getMyLinks();
      setRecentLinks(data);
    } catch (err) {
      console.error("Failed to fetch recent links:", err);
    }
  }

  // Loads page on start
  useEffect(() => {
  fetchRecentLinks();
}, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let cleanUrl = url.trim(); // user inputted url, removing spaces

    // require http or https for valid url
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl; // auto prepend https if missing
    }

    setLoading(true);

    try{
      const data = await createLink({
        original_url: cleanUrl,
      });

      const newLink={
        id: data.id,
        short: data.short_url,
        original: data.original_url,
      }

      setRecentLinks((prev) => [newLink, ...prev]); // add new link to top of list
      setUrl(""); // clear input
    } catch (err) {
      console.error("Failed to create link:", err);
    } finally {
      setLoading(false);
    }
  }

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

      {/* RECENT LINKS */}
      <section className="recents-section">
        <div className="recents-card">
          <h2>Recent Links</h2>

          {recentLinks.length === 0 ? (
            <p>No links yet.</p>
          ) : (
            <ul>
              {Array.isArray(recentLinks) && recentLinks.map((link, index) => (
                <li key={index}>
                  <div>
                    <strong>{link.shortUrl || link.short_code}</strong>
                  </div>
                  <div>{link.originalUrl || link.url}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

export default Home;