import { useEffect, useState } from 'react'
import './style.scss'

type LinkResponse = {
  id: number
  original_url: string
  short_code: string
  short_url: string
  title?: string | null
  description?: string | null
  cta_text?: string | null
  tokens_used: number
  tokens_remaining: number
}

type MyLink = {
  id: number
  original_url: string
  short_code: string
  title?: string | null
  description?: string | null
  cta_text?: string | null
  click_count: number
}

type AnalyticsSummary = {
  total_links: number
  total_clicks: number
  links: MyLink[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL

const LINK_GENERATE_ENDPOINT = `${API_BASE}/ai/link/generate`
const MY_LINKS_ENDPOINT = `${API_BASE}/ai/link/my`
const LINK_ANALYTICS_ENDPOINT = `${API_BASE}/ai/link/analytics`

function Link() {
  const [originalUrl, setOriginalUrl] = useState('')
  const [destinationSummary, setDestinationSummary] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('Professional')
  const [goal, setGoal] = useState('')
  const [platform, setPlatform] = useState('')
  const [customSlug, setCustomSlug] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<LinkResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const [myLinks, setMyLinks] = useState<MyLink[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  const getToken = () => localStorage.getItem('myshortbiz_token')


  async function generateLink() {
  const res = await fetch("http://127.0.0.1:8000/ai/link/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // only needed if you re-enable auth later:
      // "Authorization": "Bearer <token>"
    },
    body: JSON.stringify({
      original_url: "https://example.com",
      destination_summary: "test",
      audience: "users",
      tone: "casual",
      goal: "increase clicks",
      platform: "web"
    })
  });

  const data = await res.json();
  console.log(data);
  return data;
}

  const fetchMyLinksAndAnalytics = async () => {
    const token = getToken()
    if (!token) return

    setLoadingLinks(true)

    try {
      const [linksRes, analyticsRes] = await Promise.all([
        fetch(MY_LINKS_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(LINK_ANALYTICS_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ])

      const linksData = await linksRes.json()
      const analyticsData = await analyticsRes.json()

      if (!linksRes.ok) {
        throw new Error(linksData?.detail || 'Failed to fetch links')
      }

      if (!analyticsRes.ok) {
        throw new Error(analyticsData?.detail || 'Failed to fetch analytics')
      }

      setMyLinks(linksData)
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load links')
    } finally {
      setLoadingLinks(false)
    }
  }

  useEffect(() => {
    fetchMyLinksAndAnalytics()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setCopied(false)

    const token = getToken()

    if (!token) {
      setError('You must be logged in to generate a link')
      setLoading(false)
      return
    }

    try {
      const payload = {
        original_url: originalUrl,
        destination_summary: destinationSummary || null,
        audience: audience || null,
        tone,
        goal: goal || null,
        platform: platform || null,
        custom_slug: customSlug || null,
      }

      const response = await fetch(LINK_GENERATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to generate short link')
      }

      setResult(data)
      await fetchMyLinksAndAnalytics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.short_url) return

    try {
      await navigator.clipboard.writeText(result.short_url)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setError('Failed to copy link')
    }
  }

  return (
    <div className="creator-page">
      <div className="creator-page__header">
        <h1>AI Link Generator</h1>
        <p>Generate a smart short link with AI title, description, and CTA.</p>
      </div>

      <div className="creator-page__grid">
        <div className="creator-left-column">
          <form className="creator-form" onSubmit={handleSubmit}>
            <section className="creator-section">
              <h2>Link Details</h2>

              <div className="creator-field">
                <label>Original URL</label>
                <input
                  type="url"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/page"
                  required
                />
              </div>

              <div className="creator-field">
                <label>Destination Summary</label>
                <textarea
                  rows={4}
                  value={destinationSummary}
                  onChange={(e) => setDestinationSummary(e.target.value)}
                  placeholder="What is this page about?"
                />
              </div>

              <div className="creator-field">
                <label>Audience</label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Creators, students, startups..."
                />
              </div>

              <div className="creator-field">
                <label>Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Bold">Bold</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Playful">Playful</option>
                  <option value="Minimal">Minimal</option>
                </select>
              </div>

              <div className="creator-field">
                <label>Goal</label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Drive clicks, signups, conversions..."
                />
              </div>

              <div className="creator-field">
                <label>Platform</label>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="Instagram, TikTok, Email, LinkedIn..."
                />
              </div>

              <div className="creator-field">
                <label>Custom Slug</label>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="optional-custom-slug"
                />
              </div>
            </section>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Generating Link...' : 'Generate Link'}
            </button>

            {error && <div className="creator-error">{error}</div>}
          </form>

          <section className="creator-form creator-mt">
            <div className="section-title-row">
              <h2>My Links</h2>
            </div>

            {loadingLinks && <div className="creator-placeholder">Loading links...</div>}

            {!loadingLinks && myLinks.length === 0 && (
              <div className="creator-placeholder">No links created yet.</div>
            )}

            {!loadingLinks && myLinks.length > 0 && (
              <div className="link-list">
                {myLinks.map((link) => (
                  <div className="link-list-card" key={link.id}>
                    <div className="link-list-top">
                      <strong>{link.title || link.short_code}</strong>
                      <span>{link.click_count} clicks</span>
                    </div>
                    <div className="result-text result-text--wrap">
                      {API_BASE}/r/{link.short_code}
                    </div>
                    <div className="link-list-url">{link.original_url}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="creator-output">
          <h2>Generated Link</h2>

          {!result && !loading && (
            <div className="creator-placeholder">
              Your generated smart link details will appear here.
            </div>
          )}

          {loading && <div className="creator-placeholder">Generating...</div>}

          {result && (
            <>
              <div className="creator-stats">
                <span>Tokens Used: {result.tokens_used}</span>
                <span>Tokens Remaining: {result.tokens_remaining}</span>
              </div>

              <div className="creator-result-card">
                <div className="creator-result-block">
                  <label>Short URL</label>
                  <div className="link-copy-row">
                    <input type="text" value={result.short_url} readOnly />
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleCopy}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="creator-result-block">
                  <label>Short Code</label>
                  <div className="result-text">{result.short_code}</div>
                </div>

                <div className="creator-result-block">
                  <label>Original URL</label>
                  <div className="result-text result-text--wrap">
                    {result.original_url}
                  </div>
                </div>

                {result.title && (
                  <div className="creator-result-block">
                    <label>AI Title</label>
                    <div className="result-text">{result.title}</div>
                  </div>
                )}

                {result.description && (
                  <div className="creator-result-block">
                    <label>AI Description</label>
                    <div className="result-text result-text--wrap">
                      {result.description}
                    </div>
                  </div>
                )}

                {result.cta_text && (
                  <div className="creator-result-block">
                    <label>CTA Text</label>
                    <div className="result-text">{result.cta_text}</div>
                  </div>
                )}
              </div>

              {analytics && (
                <div className="creator-result-card creator-mt">
                  <div className="creator-result-block">
                    <label>Total Links</label>
                    <div className="result-text">{analytics.total_links}</div>
                  </div>

                  <div className="creator-result-block">
                    <label>Total Clicks</label>
                    <div className="result-text">{analytics.total_clicks}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Link