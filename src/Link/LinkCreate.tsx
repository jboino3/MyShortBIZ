import { useState } from "react";
import { createLink } from "../api/api";

function LinkCreate() {
  const [slugOption, setSlugOption] = useState("auto");
  const [links, setLinks] = useState<any[]>([]);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await createLink({
        original_url: url,
        destination_summary: title,
        audience: "general",
        tone: "Professional",
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

      setLinks((prev) => [newLink, ...prev]);

      console.log("Created link:", data);
    } catch (err) {
      console.error("Error creating link:", err);
    }
  };

  return (
    <main className="link-page-layout">
      <h2>Create Link</h2>

      <form className="create-link-form" onSubmit={handleSubmit}>
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label>
            <input
              type="radio"
              value="auto"
              checked={slugOption === "auto"}
              onChange={() => setSlugOption("auto")}
            />
            Auto
          </label>

          <label>
            <input
              type="radio"
              value="custom"
              checked={slugOption === "custom"}
              onChange={() => setSlugOption("custom")}
            />
            Custom
          </label>
        </div>

        {slugOption === "custom" && (
          <input
            type="text"
            placeholder="custom-slug"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
          />
        )}

        <button type="submit">Shorten Link</button>
      </form>

      {/* DEBUG OUTPUT */}
      <div>
        {links.map((l) => (
          <div key={l.id}>
            {l.short} → {l.original}
          </div>
        ))}
      </div>
    </main>
  );
}

export default LinkCreate;