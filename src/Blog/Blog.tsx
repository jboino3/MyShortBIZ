import { useState } from 'react'
import './style.scss'

type BlogFeatures = {
  bullets: boolean
  numbered: boolean
  qa: boolean
  chart: boolean
  images: boolean
  meta_description: boolean
  call_to_action: boolean
}

type BlogResponse = {
  blog_id: number
  title: string
  token_cost: number
  tokens_remaining: number
  content_markdown: string
  content_html: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const BLOG_ENDPOINT = `${API_BASE}/ai/blog/generate`

function Blog() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('General audience')
  const [tone, setTone] = useState('Professional')
  const [seoKeyword, setSeoKeyword] = useState('')
  const [wordCount, setWordCount] = useState(800)

  const [features, setFeatures] = useState<BlogFeatures>({
    bullets: true,
    numbered: false,
    qa: true,
    chart: false,
    images: false,
    meta_description: true,
    call_to_action: true,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BlogResponse | null>(null)
  const [viewMode, setViewMode] = useState<'markdown' | 'html'>('markdown')
  const [copied, setCopied] = useState(false)

  const getToken = () => localStorage.getItem('myshortbiz_token')

  const handleFeatureChange = (field: keyof BlogFeatures) => {
    setFeatures((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setCopied(false)

    const token = getToken()

    if (!token) {
      setError('You must be logged in to generate a blog')
      setLoading(false)
      return
    }

    try {
      const payload = {
        topic,
        audience,
        tone,
        seo_keyword: seoKeyword || null,
        word_count: Number(wordCount),
        features,
      }

      const response = await fetch(BLOG_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to generate blog')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return

    try {
      const textToCopy =
        viewMode === 'markdown' ? result.content_markdown : result.content_html

      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setError('Failed to copy content')
    }
  }

  return (
    <div className="creator-page">
      <div className="creator-page__header">
        <h1>AI Blog Generator</h1>
        <p>
          Create SEO-friendly blog content with customizable structure, tone,
          and output features.
        </p>
      </div>

      <div className="creator-page__grid">
        <form className="creator-form" onSubmit={handleSubmit}>
          <section className="creator-section">
            <h2>Blog Settings</h2>

            <div className="creator-field">
              <label>Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="How small businesses can use AI to save time"
                required
              />
            </div>

            <div className="creator-field">
              <label>Audience</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="General audience"
              />
            </div>

            <div className="creator-field">
              <label>Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="Professional">Professional</option>
                <option value="Friendly">Friendly</option>
                <option value="Bold">Bold</option>
                <option value="Educational">Educational</option>
                <option value="Casual">Casual</option>
                <option value="Luxury">Luxury</option>
              </select>
            </div>

            <div className="creator-field">
              <label>SEO Keyword</label>
              <input
                type="text"
                value={seoKeyword}
                onChange={(e) => setSeoKeyword(e.target.value)}
                placeholder="AI for small business"
              />
            </div>

            <div className="creator-field">
              <label>Word Count</label>
              <input
                type="number"
                min={300}
                max={2500}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
              />
              <small>Must be between 300 and 2500.</small>
            </div>
          </section>

          <section className="creator-section">
            <h2>Content Features</h2>

            <div className="feature-grid">
              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={features.bullets}
                  onChange={() => handleFeatureChange('bullets')}
                />
                <span>Bullets</span>
              </label>

              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={features.numbered}
                  onChange={() => handleFeatureChange('numbered')}
                />
                <span>Numbered Lists</span>
              </label>

              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={features.qa}
                  onChange={() => handleFeatureChange('qa')}
                />
                <span>Q&A Section</span>
              </label>

              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={features.chart}
                  onChange={() => handleFeatureChange('chart')}
                />
                <span>Chart</span>
              </label>

              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={features.images}
                  onChange={() => handleFeatureChange('images')}
                />
                <span>Images</span>
              </label>

              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={features.meta_description}
                  onChange={() => handleFeatureChange('meta_description')}
                />
                <span>Meta Description</span>
              </label>

              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={features.call_to_action}
                  onChange={() => handleFeatureChange('call_to_action')}
                />
                <span>Call To Action</span>
              </label>
            </div>
          </section>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Generating Blog...' : 'Generate Blog'}
          </button>

          {error && <div className="creator-error">{error}</div>}
        </form>

        <aside className="creator-output">
          <h2>Generated Blog</h2>

          {!result && !loading && (
            <div className="creator-placeholder">
              Your generated blog will appear here.
            </div>
          )}

          {loading && <div className="creator-placeholder">Generating...</div>}

          {result && (
            <>
              <div className="creator-stats">
                <span>Blog ID: {result.blog_id}</span>
                <span>Token Cost: {result.token_cost}</span>
                <span>Tokens Remaining: {result.tokens_remaining}</span>
              </div>

              <div className="creator-result-card">
                <div className="creator-result-block">
                  <label>Title</label>
                  <div className="result-text">{result.title}</div>
                </div>

                <div className="output-toolbar">
                  <div className="output-tabs">
                    <button
                      type="button"
                      className={viewMode === 'markdown' ? 'tab-btn active' : 'tab-btn'}
                      onClick={() => setViewMode('markdown')}
                    >
                      Markdown
                    </button>
                    <button
                      type="button"
                      className={viewMode === 'html' ? 'tab-btn active' : 'tab-btn'}
                      onClick={() => setViewMode('html')}
                    >
                      HTML
                    </button>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleCopy}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {viewMode === 'markdown' ? (
                  <div className="creator-markdown">
                    <pre>{result.content_markdown}</pre>
                  </div>
                ) : (
                  <div className="creator-markdown">
                    <pre>{result.content_html}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Blog