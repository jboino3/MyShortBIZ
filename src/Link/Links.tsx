import { Link } from "react-router-dom"; 
import { useEffect, useState } from "react";
import { getMyLinks } from "../api/api";

function Links() {
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyLinks();
        setLinks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load links:", err);
      }
    };

    load();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="links-page">
      <h1>My Links</h1>
      <p>Manage, track, and create short links.</p>
      <Link to="/link/create">
        <button className="create-btn">
          Create Link
        </button>
      </Link>

      <div className="table-card">

        <div className="table-header">
          <span>Short Link</span>
          <span>Original URL</span>
          <span>Clicks</span>
          <span>Action</span>
        </div>

        {links.length === 0 ? (
          <p>No links yet.</p>
        ) : (
          links.map((link) => {
            const shortUrl = `${window.location.origin}/r/${link.short_code}`;

            return (
              <div key={link.id} className="row">

                {/* Short URL */}
                <span>
                  <a href={shortUrl} target="_blank">
                    {link.short_code}
                  </a>
                </span>

                {/* Original URL */}
                <span className="truncate">
                  {link.original_url}
                </span>

                {/* Clicks */}
                <span>{link.click_count}</span>

                {/* Actions */}
                <span>
                  <button
                    onClick={() => copyToClipboard(shortUrl)}
                  >
                    Copy
                  </button>
                </span>

              </div>
            );
          })
        )}

      </div>
    </div>
  );
}

export default Links;