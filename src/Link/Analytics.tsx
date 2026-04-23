import { useEffect, useState } from "react";
import { getAnalytics } from "../api/api";
import "./style.scss";

const Analytics = () => {
  const [data, setData] = useState<any>(null);
  const [sortState, setSortState] =
    useState<"none" | "desc" | "asc">("none");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  if (!data) return <div>Loading...</div>;

  // SAFE copy of original order
  const originalLinks = data.links ?? [];

  // SORT LOGIC
  const sortedLinks = (() => {
    if (sortState === "none") return originalLinks;

    const copy = [...originalLinks];

    return copy.sort((a: any, b: any) => {
      if (sortState === "desc") {
        return b.click_count - a.click_count;
      } else {
        return a.click_count - b.click_count;
      }
    });
  })();

  return (
    <div className="analytics">
      <h1>Analytics Dashboard</h1>

      {/* STATS */}
      <div className="stats">
        <div className="card">Total Links: {data.total_links}</div>
        <div className="card">Total Clicks: {data.total_clicks}</div>
          <div className="card">Active Links: {originalLinks.length}</div>
      </div>

      

      {/* TABLE */}
      <div className="table-card">
        <h2>Link Performance</h2>

        {/* SORT BUTTON (fixed state name) */}
      <div className="sort-button" style={{ marginBottom: "1rem" }}>
        <label className="sort-label" style={{ marginRight: "0.5rem" }}>
          Sort by clicks:
        </label>

        <select
          value={sortState}
          onChange={(e) =>
            setSortState(
              e.target.value as "none" | "asc" | "desc"
            )
          }
        >
          <option value="none">Original</option>
          <option value="desc">Highest → Lowest</option>
          <option value="asc">Lowest → Highest</option>
        </select>
      </div>

        <div className="table-header">
          <span>Short Link</span>

          <span
            onClick={() => {
              setSortState((prev) => {
                if (prev === "none") return "desc";
                if (prev === "desc") return "asc";
                return "none";
              });
            }}
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            Clicks{" "}
            {sortState === "desc"
              ? "🔽"
              : sortState === "asc"
              ? "🔼"
              : ""}
          </span>

          <span>Original URL</span>
        </div>

        {sortedLinks
          .slice(0, 10)
          .map((link: any) => (
            <div key={link.id} className="row">
              <a
                href={`http://127.0.0.1:8000/r/${link.short_code}`}
                target="_blank"
                rel="noopener noreferrer"
                >
                http://127.0.0.1:8000/r/{link.short_code}
              </a>

              <span>{link.click_count}</span>

              <span className="truncate">
                <a
                  href={link.original_url}
                  target="_blank"
                  rel="noreferrer"
                  className="original-link"
                >
                  {link.original_url}
                </a>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Analytics;