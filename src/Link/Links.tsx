import { Link } from "react-router-dom"; 
import { useEffect, useState } from "react";
import { getMyLinks } from "../api/api";

function Links() {
  const API_BASE = import.meta.env.VITE_API_URL;

  const [links, setLinks] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Pagination Variables
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // FILTER logic
  const filteredLinks = links.filter((link) => {
  const q = search.toLowerCase();

  return (
    link.short_code.toLowerCase().includes(q) ||
    link.original_url.toLowerCase().includes(q)
  );
});

  // Pagination Logic
  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLinks = filteredLinks.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  
  return (
    <div className="links-page">
      <h1>My Links</h1>
      <p>Manage, track, and create short links.</p>
      <Link to="/link/create">
        <button className="create-btn">
          Create Link
        </button>
      </Link>

      <div className="links-controls">
        <input
          type="text"
          placeholder="Search links (enter short link URL or original URL)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1); // reset page on search
          }}
        />
      </div>

          {/* Table */}
      <div className="table-card">
        <div className="table-header">
          <span>Short Link</span>
          <span>Original URL</span>
          <span>Action</span>
        </div>

        {paginatedLinks.length === 0 ? (
          <p>No links yet.</p>
        ) : (
          paginatedLinks.map((link) => {
            const shortUrl =  `${API_BASE}/r/${link.short_code}`;

            return (
              <div key={link.id} className="row">

                {/* Short URL */}
                <span>
                  <a
                    href={`http://127.0.0.1:8000/r/${link.short_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    >
                    http://127.0.0.1:8000/r/{link.short_code}
                  </a>
                </span>

                {/* Original URL */}
                <span className="truncate">
                  {link.original_url}
                </span>


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

        <div className="pagination-controls">
  <button
    onClick={() => setCurrentPage((p) => p - 1)}
    disabled={currentPage === 1}
  >
    ← Prev
  </button>

  <span>
    Page {currentPage} of {totalPages || 1}
  </span>

  <button
    onClick={() => setCurrentPage((p) => p + 1)}
    disabled={currentPage === totalPages}
  >
    Next →
  </button>
</div>

      </div>
    </div>
  );
}

export default Links;