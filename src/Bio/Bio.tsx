import { useState } from 'react'
import './style.scss'

function Bio() {
  const [name, setName] = useState('')
  const [tone, setTone] = useState('Professional')
  const [selectedTheme, setSelectedTheme] = useState('Midnight')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const themes = [
    { name: 'Midnight', class: 'theme-midnight' },
    { name: 'Glass', class: 'theme-glass' },
    { name: 'Sunset', class: 'theme-sunset' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const token = localStorage.getItem('myshortbiz_token')

    const response = await fetch('http://localhost:8000/ai/bio/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, tone, platform: selectedTheme })
    })
    const data = await response.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="bio-workspace">
      <div className="onboarding-column">
        <form className="bio-card" onSubmit={handleSubmit}>
          <h2>Select Theme</h2>
          <div className="theme-grid">
            {themes.map(t => (
              <button 
                key={t.name} type="button"
                className={`theme-chip-fancy ${t.class} ${selectedTheme === t.name ? 'active' : ''}`}
                onClick={() => setSelectedTheme(t.name)}
              >
                <div className="swatch" />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
          <button className="btn--primary" type="submit">Launch MyShort.Bio</button>
        </form>
      </div>
      <div className="preview-column">
        <div className="phone-mockup">
          <div className={`phone-screen theme-${selectedTheme.toLowerCase()}`}>
            <div className="username">@{name || 'username'}</div>
            <p className="bio-text">{result ? result.content : "Waiting for AI..."}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Bio