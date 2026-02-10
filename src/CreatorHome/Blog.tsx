// src/CreatorHome/Blog.tsx
import "./Blog.scss";

export default function Blog() {
  return (
    <main className="page blog-layout">
      <div className="blog-grid">
        
        {/* Input Side: Curated Blog Generator */}
        <section className="card control-panel">
          <div className="panel-header">
            <span className="eyebrow">MyShort.Blog</span>
            <h2>Content Generator</h2>
          </div>
          
          <div className="input-group">
            <label>1. Topic / Keywords</label>
            <input type="text" placeholder="example: Video Games Trends 2026" />
          </div>

          <div className="input-group">
            <label>2. Source Link (Optional)</label>
            <input type="text" placeholder="im assuming the AI model will be able to open links" />
          </div>

          <div className="input-group">
            <label>3. Target Word Count</label>
            <select className="custom-select">
              <option>Small (10-50 words)</option>
              <option>Medium (50-200 words)</option>
              <option>Large (200+ words)</option>
            </select>
            <small className="cost-notice">Note: larger posts will cost more tokens.</small>
          </div>

          <div className="input-group content-style-section">
            <label className="section-label">4. Additional Content Styles</label>
  
          <div className="checkbox-grid">
           <label className="chip-item">
              <input type="checkbox" />
              <span className="chip-content">Charts</span>
            </label>
          <label className="chip-item">
              <input type="checkbox" />
              <span className="chip-content">Bullet Points</span>
           </label>
          <label className="chip-item">
              <input type="checkbox" />
              <span className="chip-content">Numbered List</span>
          </label>
              <label className="chip-item">
              <input type="checkbox" />
              <span className="chip-content">Q&A Format</span>
              </label>
            </div>
          </div>

          <div className="action-stack">
            <button className="btn btn--ghost">Generate AI Image</button>
            <button className="btn btn--ghost">Attach Image</button>
            <button className="btn btn--primary main-gen">Create Post</button>
          </div>
        </section>

        {/* Output Side: Live Preview */}
        <section className="preview-container">
          <div className="preview-header">
            <h3>Live Preview</h3>
            <span className="status-badge">Awaiting Prompt...</span>
          </div>
          <div className="preview-box">
             <div className="ai-placeholder-content">
                <p>ONCE WE CHOOSE AN AI MODEL IT WOULD PREVIEW THE BLOG POST HERE</p>
             </div>
          </div>
        </section>

      </div>
    </main>
  );
}