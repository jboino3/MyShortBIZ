import { useEffect, useState } from 'react'
import './style.scss'

type VideoGenerateResponse = {
  id: number
  provider: string
  model: string
  status: string
  provider_job_id?: string | null
  final_prompt: string
}

type VideoJob = {
  id: number
  provider: string
  provider_job_id?: string | null
  prompt: string
  prompt_image?: string | null
  model: string
  ratio: string
  duration: number
  status: string
  output_url?: string | null
  thumbnail_url?: string | null
  error_message?: string | null
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const VIDEO_GENERATE_ENDPOINT = `${API_BASE}/ai/video/generate`
const VIDEO_MY_ENDPOINT = `${API_BASE}/ai/video/my`

function Video() {
  const [mode, setMode] = useState<'direct' | 'structured'>('direct')

  const [prompt, setPrompt] = useState('')

  const [topic, setTopic] = useState('')
  const [productName, setProductName] = useState('')
  const [productType, setProductType] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [platform, setPlatform] = useState('TikTok')
  const [tone, setTone] = useState('Professional')
  const [goal, setGoal] = useState('Promote a product')
  const [callToAction, setCallToAction] = useState('')
  const [visualStyle, setVisualStyle] = useState('')
  const [extraContext, setExtraContext] = useState('')

  const [promptImage, setPromptImage] = useState('')
  const [ratio, setRatio] = useState('1280:720')
  const [duration, setDuration] = useState(5)

  const [loading, setLoading] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [refreshingJobId, setRefreshingJobId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<VideoGenerateResponse | null>(null)
  const [jobs, setJobs] = useState<VideoJob[]>([])
  const [copied, setCopied] = useState(false)

  const getToken = () => localStorage.getItem('myshortbiz_token')

  const fetchJobs = async () => {
    const token = getToken()
    if (!token) return

    setLoadingJobs(true)

    try {
      const response = await fetch(VIDEO_MY_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to load video jobs')
      }

      setJobs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos')
    } finally {
      setLoadingJobs(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setCopied(false)

    const token = getToken()

    if (!token) {
      setError('You must be logged in to generate a video')
      setLoading(false)
      return
    }

    try {
      const payload =
        mode === 'direct'
          ? {
              prompt,
              prompt_image: promptImage || null,
              ratio,
              duration: Number(duration),
            }
          : {
              topic,
              product_name: productName || null,
              product_type: productType || null,
              target_audience: targetAudience || null,
              platform,
              tone,
              goal,
              call_to_action: callToAction || null,
              visual_style: visualStyle || null,
              extra_context: extraContext || null,
              prompt_image: promptImage || null,
              ratio,
              duration: Number(duration),
            }

      const response = await fetch(VIDEO_GENERATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to generate video')
      }

      setResult(data)
      await fetchJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshJob = async (jobId: number) => {
    const token = getToken()
    if (!token) {
      setError('You must be logged in to refresh jobs')
      return
    }

    setRefreshingJobId(jobId)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/ai/video/${jobId}/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to refresh video job')
      }

      setJobs((prev) => prev.map((job) => (job.id === jobId ? data : job)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh job')
    } finally {
      setRefreshingJobId(null)
    }
  }

  const handleCopyPrompt = async () => {
    if (!result?.final_prompt) return

    try {
      await navigator.clipboard.writeText(result.final_prompt)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setError('Failed to copy prompt')
    }
  }

  return (
    <div className="creator-page">
      <div className="creator-page__header">
        <h1>AI Video Generator</h1>
        <p>
          Generate Runway video jobs using either a direct prompt or structured
          campaign inputs.
        </p>
      </div>

      <div className="creator-page__grid">
        <div className="creator-left-column">
          <form className="creator-form" onSubmit={handleSubmit}>
            <section className="creator-section">
              <div className="section-title-row">
                <h2>Generation Mode</h2>
              </div>

              <div className="mode-toggle">
                <button
                  type="button"
                  className={mode === 'direct' ? 'tab-btn active' : 'tab-btn'}
                  onClick={() => setMode('direct')}
                >
                  Direct Prompt
                </button>
                <button
                  type="button"
                  className={mode === 'structured' ? 'tab-btn active' : 'tab-btn'}
                  onClick={() => setMode('structured')}
                >
                  Structured Builder
                </button>
              </div>
            </section>

            {mode === 'direct' ? (
              <section className="creator-section">
                <h2>Direct Prompt</h2>

                <div className="creator-field">
                  <label>Prompt</label>
                  <textarea
                    rows={6}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the video you want generated..."
                    required={mode === 'direct'}
                  />
                </div>
              </section>
            ) : (
              <section className="creator-section">
                <h2>Structured Prompt Builder</h2>

                <div className="creator-field">
                  <label>Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Launch a productivity app for creators"
                    required={mode === 'structured'}
                  />
                </div>

                <div className="creator-row">
                  <div className="creator-field">
                    <label>Product Name</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="MyShortBIZ"
                    />
                  </div>

                  <div className="creator-field">
                    <label>Product Type</label>
                    <input
                      type="text"
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      placeholder="SaaS platform"
                    />
                  </div>
                </div>

                <div className="creator-field">
                  <label>Target Audience</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Small business owners, creators, founders..."
                  />
                </div>

                <div className="creator-row">
                  <div className="creator-field">
                    <label>Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                    >
                      <option value="TikTok">TikTok</option>
                      <option value="Instagram Reels">Instagram Reels</option>
                      <option value="YouTube Shorts">YouTube Shorts</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Website">Website</option>
                    </select>
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
                </div>

                <div className="creator-field">
                  <label>Goal</label>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Promote a product"
                  />
                </div>

                <div className="creator-field">
                  <label>Call To Action</label>
                  <input
                    type="text"
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    placeholder="Start your free trial today"
                  />
                </div>

                <div className="creator-field">
                  <label>Visual Style</label>
                  <input
                    type="text"
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    placeholder="Cinematic, modern, luxury, UGC, minimal..."
                  />
                </div>

                <div className="creator-field">
                  <label>Extra Context</label>
                  <textarea
                    rows={4}
                    value={extraContext}
                    onChange={(e) => setExtraContext(e.target.value)}
                    placeholder="Anything else that should influence the final prompt..."
                  />
                </div>
              </section>
            )}

            <section className="creator-section">
              <h2>Runway Settings</h2>

              <div className="creator-field">
                <label>Prompt Image URL</label>
                <input
                  type="url"
                  value={promptImage}
                  onChange={(e) => setPromptImage(e.target.value)}
                  placeholder="https://example.com/image.png"
                />
              </div>

              <div className="creator-row">
                <div className="creator-field">
                  <label>Aspect Ratio</label>
                  <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
                    <option value="1280:720">1280:720</option>
                    <option value="720:1280">720:1280</option>
                    <option value="1104:832">1104:832</option>
                    <option value="832:1104">832:1104</option>
                    <option value="960:960">960:960</option>
                    <option value="1584:672">1584:672</option>
                  </select>
                </div>

                <div className="creator-field">
                  <label>Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    <option value={2}>2 seconds</option>
                    <option value={3}>3 seconds</option>
                    <option value={4}>4 seconds</option>
                    <option value={5}>5 seconds</option>
                    <option value={6}>6 seconds</option>
                    <option value={7}>7 seconds</option>
                    <option value={8}>8 seconds</option>
                    <option value={9}>9 seconds</option>
                    <option value={10}>10 seconds</option>
                  </select>
                </div>
              </div>
            </section>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Creating Video Job...' : 'Generate Video'}
            </button>

            {error && <div className="creator-error">{error}</div>}
          </form>

          <section className="creator-form creator-mt">
            <div className="section-title-row">
              <h2>My Video Jobs</h2>
            </div>

            {loadingJobs && <div className="creator-placeholder">Loading jobs...</div>}

            {!loadingJobs && jobs.length === 0 && (
              <div className="creator-placeholder">No video jobs yet.</div>
            )}

            {!loadingJobs && jobs.length > 0 && (
              <div className="video-job-list">
                {jobs.map((job) => (
                  <div className="video-job-card" key={job.id}>
                    <div className="video-job-top">
                      <div>
                        <strong>Job #{job.id}</strong>
                        <div className="video-job-meta">
                          {job.model} • {job.duration}s • {job.ratio}
                        </div>
                      </div>

                      <span className={`status-pill status-pill--${job.status}`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="result-text result-text--wrap">
                      {job.prompt}
                    </div>

                    {job.thumbnail_url && (
                      <img
                        className="video-thumb"
                        src={job.thumbnail_url}
                        alt={`Thumbnail for video job ${job.id}`}
                      />
                    )}

                    {job.output_url && (
                      <a
                        className="video-link"
                        href={job.output_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open generated video
                      </a>
                    )}

                    {job.error_message && (
                      <div className="creator-error video-job-error">
                        {job.error_message}
                      </div>
                    )}

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => handleRefreshJob(job.id)}
                      disabled={refreshingJobId === job.id}
                    >
                      {refreshingJobId === job.id ? 'Refreshing...' : 'Refresh Status'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="creator-output">
          <h2>Latest Video Job</h2>

          {!result && !loading && (
            <div className="creator-placeholder">
              Your latest generated video job details will appear here.
            </div>
          )}

          {loading && <div className="creator-placeholder">Creating job...</div>}

          {result && (
            <div className="creator-result-card">
              <div className="creator-result-block">
                <label>Job ID</label>
                <div className="result-text">{result.id}</div>
              </div>

              <div className="creator-result-block">
                <label>Provider</label>
                <div className="result-text">{result.provider}</div>
              </div>

              <div className="creator-result-block">
                <label>Model</label>
                <div className="result-text">{result.model}</div>
              </div>

              <div className="creator-result-block">
                <label>Status</label>
                <div className="result-text">{result.status}</div>
              </div>

              {result.provider_job_id && (
                <div className="creator-result-block">
                  <label>Provider Job ID</label>
                  <div className="result-text result-text--wrap">
                    {result.provider_job_id}
                  </div>
                </div>
              )}

              <div className="output-toolbar">
                <div className="creator-result-block">
                  <label>Final Prompt</label>
                </div>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleCopyPrompt}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="creator-markdown">
                <pre>{result.final_prompt}</pre>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Video