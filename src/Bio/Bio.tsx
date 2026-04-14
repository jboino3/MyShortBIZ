import { useState } from 'react'
import './style.scss'

type BioResponse = {
  content: string
  tokens_used: number
  tokens_remaining: number
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const BIO_ENDPOINT = `${API_BASE}/ai/bio/generate`

function Bio() {
  const [name, setName] = useState('')
  const [profession, setProfession] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('Professional')
  const [platform, setPlatform] = useState('General')
  const [achievements, setAchievements] = useState('')
  const [skills, setSkills] = useState('')
  const [audience, setAudience] = useState('')
  const [maxLength, setMaxLength] = useState(160)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BioResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const getToken = () => localStorage.getItem('myshortbiz_token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setCopied(false)

    const token = getToken()

    if (!token) {
      setError('You must be logged in to generate a bio')
      setLoading(false)
      return
    }

    try {
      const payload = {
        name,
        profession: profession || null,
        niche: niche || null,
        tone,
        platform,
        achievements: achievements || null,
        skills: skills || null,
        audience: audience || null,
        max_length: Number(maxLength),
      }

      const response = await fetch(BIO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to generate bio')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.content) return

    try {
      await navigator.clipboard.writeText(result.content)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setError('Failed to copy bio')
    }
  }

  return (
    <div className="creator-page">
      <div className="creator-page__header">
        <h1>AI Bio Generator</h1>
        <p>
          Create a polished bio tailored to your platform, audience, and tone.
        </p>
      </div>

      <div className="creator-page__grid">
        <form className="creator-form" onSubmit={handleSubmit}>
          <section className="creator-section">
            <h2>Bio Details</h2>

            <div className="creator-field">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jonah Ching"
                required
              />
            </div>

            <div className="creator-field">
              <label>Profession</label>
              <input
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="Software Engineer"
              />
            </div>

            <div className="creator-field">
              <label>Niche</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Full-stack development, AI tools, startups"
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
              <label>Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter">Twitter / X</option>
                <option value="TikTok">TikTok</option>
                <option value="Website">Website</option>
                <option value="Portfolio">Portfolio</option>
              </select>
            </div>

            <div className="creator-field">
              <label>Achievements</label>
              <textarea
                rows={3}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="Built products, won awards, reached milestones..."
              />
            </div>

            <div className="creator-field">
              <label>Skills</label>
              <textarea
                rows={3}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, FastAPI, AWS, product strategy..."
              />
            </div>

            <div className="creator-field">
              <label>Audience</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Recruiters, founders, potential clients..."
              />
            </div>

            <div className="creator-field">
              <label>Max Length</label>
              <input
                type="number"
                min={40}
                max={500}
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value))}
              />
            </div>
          </section>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Generating Bio...' : 'Generate Bio'}
          </button>

          {error && <div className="creator-error">{error}</div>}
        </form>

        <aside className="creator-output">
          <h2>Generated Bio</h2>

          {!result && !loading && (
            <div className="creator-placeholder">
              Your generated bio will appear here.
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
                <div className="output-toolbar">
                  <div className="creator-result-block">
                    <label>Bio Output</label>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleCopy}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="creator-markdown">
                  <pre>{result.content}</pre>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Bio