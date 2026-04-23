// src/CreatorHome/Blog.tsx
import "./Blog.scss";
import React, { useState } from 'react';

export default function Blog() {

  const [features, setFeatures] = useState({
    bullets: false,
    numbered: false,
    qa: false,
    chart: false,
    meta_description: false
  });

  const MAX_KEYWORDS = 8;
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState(['']);
  const [topic, setTopic] = useState(""); 
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // --- BACKEND STATES ---
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");

  const addKeywordField = () => {
    if (keywords.length < MAX_KEYWORDS) setKeywords([...keywords, '']); 
  };

  const removeKeywordField = (index: number) => {
  if (keywords.length > 1) { // Always keep at least one field
    const newKeywords = keywords.filter((_, i) => i !== index);
    setKeywords(newKeywords);
  }
};

  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  // --- BACKEND LOGIC ---
  const [userBlogs, setUserBlogs] = useState([]);
  const [currentBlogId, setCurrentBlogId] = useState<number | null>(null);
  const [refinementText, setRefinementText] = useState("");
  const [wordCount, setWordCount] = useState("500");

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    console.log("Current Token:", token);
    if (!token) return;

    try {
      const response = await fetch("http://localhost:8000/api/blog/my", {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const history = await response.json();
        console.log("Successfully fetched history:", history);
        setUserBlogs(history); // update please
      }
    } catch (err) {
      console.error("History fetch failed:", err);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleFinalizeAI = async () => {
  setLoading(true);
  const token = localStorage.getItem('myshortbiz_token');

  // map frontend
  const payload = {
    topic: topic || "",
    description: description || "",
    seo_keyword: keywords[0] || "",
    all_keywords: keywords.filter(k => k.trim()), // use all keywords
    audience: "General Business",
    tone: "Professional",
    word_count: parseInt(wordCount) || 300, 
    features: features,
    existing_content: generatedContent,
    refinement_instruction: refinementText
  };

  try {
    const response = await fetch("http://localhost:8000/api/blog/generate", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    setGeneratedContent(data.content_markdown || data.content);
    setCurrentBlogId(data.blog_id);
    await fetchHistory();


    //updated ui
    setGeneratedContent(data.content_markdown || data.content);
  } catch (err) {
    setGeneratedContent("Connection failed. Ensure the server is running!");
  } finally {
    setLoading(false);
  }

  await fetchHistory();
};

  const loadSpecificBlog = async (id: number) => {
    setLoading(true);
    const token = localStorage.getItem('token');
      try {
        const response = await fetch(`http://localhost:8000/api/blog/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
      });
    const data = await response.json();
      setGeneratedContent(data.content_markdown);
      setIsReviewMode(true); 
    } finally {
    setLoading(false);
    }
  };

  const handleGeneratePrompt = async () => {
  setIsReviewMode(true); // review mode
  setLoading(true); // 'ai is thinking' text
  
  const token = localStorage.getItem('token');

  // maps steps
  const payload = {
    topic: topic || "",
    seo_keyword: keywords[0] || "",
    all_keywords: keywords.filter(k => k.trim()), // sends all keywords
    description: description,
    audience: "General", 
    tone: "Professional",
    word_count: 300, 
    features: {
    bullets: features.bullets,
    qa: features.qa,
    meta_description: features.meta_description
  }
  };

  try {
    const response = await fetch("http://localhost:8000/api/blog/generate", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    setGeneratedContent(data.content_markdown || data.content);
  } catch (err) {
    setGeneratedContent("Error: Backend connection failed. Check your terminal.");
  } finally {
    setLoading(false);
  }
};

  const handleBackToEdit = () => setIsReviewMode(false);

  const featureLabels: Record<string, string> = {
  bullets: "Bullet Points",
  numbered: "Numbered List",
  qa: "Q&A Section",
  chart: "Data Chart",
  meta_description: "SEO Meta Description"
  };

  return (
    <main className={`page blog-layout ${isReviewMode ? 'review-active' : ''}`}>
      <div className="blog-grid">
        
        <section className={`card control-panel ${isReviewMode ? 'summary-mode' : ''}`}>
          {!isReviewMode && (
            <div className="panel-header">
              <span className="eyebrow">MyShort.Blog</span>
              <h2>Content Generator</h2>
            </div>
          )}
          
          {!isReviewMode ? (
            <>
              {/* 1. Topic */}
              <div className="input-group">
                <label>1. Topic</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="example: write a post..." />
              </div>

              {/* 2. Keywords */}
              <div className="input-group keyword-section">
                <label className="section-label">2. Keywords</label>
                {keywords.map((word, index) => (
                  <div className="keyword-row" key={index}>
                    <input type="text" placeholder="add a keyword..." value={word} onChange={(e) => handleKeywordChange(index, e.target.value)} />
                    <div className="keyword-actions">
                    {index > 0 && (
                      <button className="remove-key-btn" onClick={() => removeKeywordField(index)}>×</button>
                    )}
                    
                    {index === keywords.length - 1 && keywords.length < MAX_KEYWORDS && (
                      <button className="add-key-btn" onClick={addKeywordField}>+</button>
                    )}
                  </div>
                </div>
                ))}
              </div>
              
              {/* 3, 4, 5 */}
              <div className="input-group"><label>3. Description</label> <input type="text" placeholder="Write a sentence or two about the blog topic" value={description} onChange={(e) => setDescription(e.target.value)}/></div>
              <div className="input-group"><label>4. Source Link (Optional)</label> <input type="text" placeholder="Attach a link!"/></div>
              <div className="input-group">
                <label>5. Target Word Count</label>
                <select className="custom-select" value={wordCount} onChange={(e) => setWordCount(e.target.value)}>
                  <option value="150">Small (10-150 words)</option>
                  <option value="500">Medium (150-500 words)</option>
                  <option value="1000">Large (500+ words)</option>
              </select>
              <small className="cost-notice">Note: larger posts will cost more tokens.</small>
              </div>

              {/* 6. Content Styles */}
              <div className="input-group content-style-section">
  <label className="section-label">6. Additional Content Styles</label>
  <div className="checkbox-grid">
      {Object.keys(features).map((f) => (
      <label key={f} className="chip-item">
        <input 
          type="checkbox" 
          hidden 
          checked={features[f as keyof typeof features]} 
          onChange={() => setFeatures({
            ...features, 
            [f]: !features[f as keyof typeof features]
          })} 
        />
        <div className="chip-content">
          <span>{featureLabels[f] || f}</span>
          {features[f as keyof typeof features] && <span className="check"></span>}
        </div>
      </label>
    ))}
  </div>
</div>

              <div className="action-stack">
                <button className="btn btn--primary main-gen" onClick={handleGeneratePrompt}>Generate Prompt</button>
              </div>
            </>
          ) : (
            <div className="summary-bubble">
              <div className="summary-header">
                <span className="eyebrow">Request Summary</span>
                <button className="edit-link" onClick={handleBackToEdit}>Edit</button>
              </div>
              <div className="summary-content">
    <div className="summary-row">
      <span className="label">Topic</span>
      <p className="value">{topic || "Untitled"}</p>
    </div>

    <div className="summary-row">
      <span className="label">Keywords</span>
      <div className="keyword-pills">
        {keywords.filter(k => k.trim()).map((k, i) => (
          <span key={i} className="pill-tag">{k}</span>
        ))}
      </div>
    </div>

    <div className="meta-grid">
      <div className="summary-row">
        <span className="label">Target Length</span>
        <p className="value small-text">
          {wordCount === "150" && "Small (10-150 words)"}
          {wordCount === "500" && "Medium (150-500 words)"}
          {wordCount === "1000" && "Large (500+ words)"}  
        </p>
      </div>
    </div>

    <div className="summary-row">
      <span className="label">Active Styles</span>
      <div className="style-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {Object.entries(features)
          .filter(([_, active]) => active)
          .map(([name]) => (
        <span key={name} className="pill-tag small">{name.replace('_', ' ')}</span>
      ))}
    {/* if nothing is selected, placeholder */}
    {!Object.values(features).some(v => v) && <p className="value small-text">None</p>}
  </div>
</div>

        {true && (
    <div className="summary-row history-section" style={{ marginTop: '20px', borderTop: '1px solid #f0f0f0', paddingTop: '15px' }}>
      <span className="label">Recent Blogs</span>
      <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        {userBlogs.slice(0, 5).map((blog: any) => (
          <button 
            key={blog.blog_id} 
            className="history-item-btn"
            onClick={() => loadSpecificBlog(blog.blog_id)}
            style={{
              textAlign: 'left',
              background: '#f9f7ff',
              border: '1px solid #eee',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {blog.title || `Blog #${blog.blog_id}`}
          </button>
        ))}
      </div>
    </div>
  )}

  </div>
            </div>
          )}
        </section>

        <div className="workspace-wrapper">
          <section className="preview-container central-preview">
            <div className="preview-header">
              <h3>Live Preview</h3>
              <span className="status-badge">{loading ? "AI is thinking..." : "Ready"}</span>
            </div>
            
            {/* RED BOX FIX */}
            <div className={`preview-box ${generatedContent ? 'has-content' : 'waiting-state'}`}>
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>AI is writing your blog post based on your keywords...</p>
        </div>
      ) : generatedContent ? (
        <div className="ai-rendered-content">
          {/* WHERE AI SHOULD GENERATE hopefully */}
          <div className="ai-rendered-content">
  {generatedContent.split('\n').map((line, i) => {
    // converts '# ' into <h1>
    if (line.startsWith('# ')) {
      return <h1 key={i}>{line.replace('# ', '')}</h1>;
    }
    // converts '## ' into <h2>
    if (line.startsWith('## ')) {
      return <h2 key={i}>{line.replace('## ', '')}</h2>;
    }
    // converts '###' into <h3>
    if (line.startsWith('### ')) {
    return <h3 key={i} className="content-h3">{line.replace('### ', '')}</h3>;
    }
    // converts '- ' or '* ' into <li>
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={i}>{line.replace(/^[*-]\s/, '')}</li>;
    }
    // handles bold text **word**
    if (line.includes('**')) {
        return (
          <p key={i} dangerouslySetInnerHTML={{ 
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
          }} />
        );
    }
    // paragraph
    return line.trim() === "" ? <br key={i} /> : <p key={i}>{line}</p>;
  })}
</div>
        </div>
      ) : (
        <div className="waiting-text">
          <p>Waiting for Prompt Generation...</p>
          <span>Fill out the info on the left to begin.</span>
        </div>
        
      )}
    </div>
  </section>

          {isReviewMode && (
            <section className="refinement-panel">
              <div className="refinement-card card">
                <div className="card-header"><h4>Step 2: Edit Your Prompt!</h4></div>
                <textarea className="refine-input" placeholder="e.g. Focus the blog more on something.." value={refinementText} onChange={(e) => setRefinementText(e.target.value)}></textarea>
                <button className="btn btn--primary finalize-btn" onClick={handleFinalizeAI}>
                  {loading ? "Writing Post..." : "Confirm & Edit Prompt"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}