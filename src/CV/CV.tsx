import { useState } from 'react'
import './style.scss'

type Experience = {
  title: string
  company: string
  start_date: string
  end_date: string
  description: string
}

type Education = {
  school: string
  degree: string
  start_date: string
  end_date: string
}

type Project = {
  name: string
  description: string
}

type CVResponse = {
  content_markdown: string
  tokens_used: number
  tokens_remaining: number
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const CV_ENDPOINT = `${API_BASE}/ai/cv/generate`

function CV() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [skillsInput, setSkillsInput] = useState('')

  const [experience, setExperience] = useState<Experience[]>([
    {
      title: '',
      company: '',
      start_date: '',
      end_date: '',
      description: '',
    },
  ])

  const [education, setEducation] = useState<Education[]>([
    {
      school: '',
      degree: '',
      start_date: '',
      end_date: '',
    },
  ])

  const [projects, setProjects] = useState<Project[]>([
    {
      name: '',
      description: '',
    },
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CVResponse | null>(null)

  const handleExperienceChange = (
    index: number,
    field: keyof Experience,
    value: string
  ) => {
    const updated = [...experience]
    updated[index][field] = value
    setExperience(updated)
  }

  const handleEducationChange = (
    index: number,
    field: keyof Education,
    value: string
  ) => {
    const updated = [...education]
    updated[index][field] = value
    setEducation(updated)
  }

  const handleProjectChange = (
    index: number,
    field: keyof Project,
    value: string
  ) => {
    const updated = [...projects]
    updated[index][field] = value
    setProjects(updated)
  }

  const addExperience = () => {
    setExperience([
      ...experience,
      {
        title: '',
        company: '',
        start_date: '',
        end_date: '',
        description: '',
      },
    ])
  }

  const addEducation = () => {
    setEducation([
      ...education,
      {
        school: '',
        degree: '',
        start_date: '',
        end_date: '',
      },
    ])
  }

  const addProject = () => {
    setProjects([
      ...projects,
      {
        name: '',
        description: '',
      },
    ])
  }

  const removeExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index))
  }

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index))
  }

  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const payload = {
        full_name: fullName,
        email,
        phone: phone || null,
        skills: skillsInput
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        experience: experience.filter(
          (item) =>
            item.title.trim() ||
            item.company.trim() ||
            item.start_date.trim() ||
            item.end_date.trim() ||
            item.description.trim()
        ),
        education: education.filter(
          (item) =>
            item.school.trim() ||
            item.degree.trim() ||
            item.start_date.trim() ||
            item.end_date.trim()
        ),
        projects: projects.filter(
          (item) => item.name.trim() || item.description.trim()
        ),
      }

      const response = await fetch(CV_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('myshortbiz_token')}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to generate CV')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="creator-page">
      <div className="creator-page__header">
        <h1>CV Generator</h1>
        <p>Generate a polished CV using your experience, education, skills, and projects.</p>
      </div>

      <div className="creator-page__grid">
        <form className="creator-form" onSubmit={handleSubmit}>
          <section className="creator-section">
            <h2>Basic Info</h2>

            <div className="creator-field">
              <label>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="creator-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@email.com"
                required
              />
            </div>

            <div className="creator-field">
              <label>Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="creator-field">
              <label>Skills</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="React, TypeScript, FastAPI, AWS"
              />
              <small>Separate skills with commas.</small>
            </div>
          </section>

          <section className="creator-section">
            <div className="section-title-row">
              <h2>Experience</h2>
              <button type="button" className="secondary-btn" onClick={addExperience}>
                + Add Experience
              </button>
            </div>

            {experience.map((item, index) => (
              <div className="creator-card" key={`experience-${index}`}>
                <div className="creator-field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      handleExperienceChange(index, 'title', e.target.value)
                    }
                  />
                </div>

                <div className="creator-field">
                  <label>Company</label>
                  <input
                    type="text"
                    value={item.company}
                    onChange={(e) =>
                      handleExperienceChange(index, 'company', e.target.value)
                    }
                  />
                </div>

                <div className="creator-row">
                  <div className="creator-field">
                    <label>Start Date</label>
                    <input
                      type="text"
                      value={item.start_date}
                      onChange={(e) =>
                        handleExperienceChange(index, 'start_date', e.target.value)
                      }
                      placeholder="Jan 2023"
                    />
                  </div>

                  <div className="creator-field">
                    <label>End Date</label>
                    <input
                      type="text"
                      value={item.end_date}
                      onChange={(e) =>
                        handleExperienceChange(index, 'end_date', e.target.value)
                      }
                      placeholder="Present"
                    />
                  </div>
                </div>

                <div className="creator-field">
                  <label>Description</label>
                  <textarea
                    rows={4}
                    value={item.description}
                    onChange={(e) =>
                      handleExperienceChange(index, 'description', e.target.value)
                    }
                    placeholder="Describe your work and impact"
                  />
                </div>

                {experience.length > 1 && (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => removeExperience(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </section>

          <section className="creator-section">
            <div className="section-title-row">
              <h2>Education</h2>
              <button type="button" className="secondary-btn" onClick={addEducation}>
                + Add Education
              </button>
            </div>

            {education.map((item, index) => (
              <div className="creator-card" key={`education-${index}`}>
                <div className="creator-field">
                  <label>School</label>
                  <input
                    type="text"
                    value={item.school}
                    onChange={(e) =>
                      handleEducationChange(index, 'school', e.target.value)
                    }
                  />
                </div>

                <div className="creator-field">
                  <label>Degree</label>
                  <input
                    type="text"
                    value={item.degree}
                    onChange={(e) =>
                      handleEducationChange(index, 'degree', e.target.value)
                    }
                  />
                </div>

                <div className="creator-row">
                  <div className="creator-field">
                    <label>Start Date</label>
                    <input
                      type="text"
                      value={item.start_date}
                      onChange={(e) =>
                        handleEducationChange(index, 'start_date', e.target.value)
                      }
                    />
                  </div>

                  <div className="creator-field">
                    <label>End Date</label>
                    <input
                      type="text"
                      value={item.end_date}
                      onChange={(e) =>
                        handleEducationChange(index, 'end_date', e.target.value)
                      }
                    />
                  </div>
                </div>

                {education.length > 1 && (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => removeEducation(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </section>

          <section className="creator-section">
            <div className="section-title-row">
              <h2>Projects</h2>
              <button type="button" className="secondary-btn" onClick={addProject}>
                + Add Project
              </button>
            </div>

            {projects.map((item, index) => (
              <div className="creator-card" key={`project-${index}`}>
                <div className="creator-field">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      handleProjectChange(index, 'name', e.target.value)
                    }
                  />
                </div>

                <div className="creator-field">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={item.description}
                    onChange={(e) =>
                      handleProjectChange(index, 'description', e.target.value)
                    }
                  />
                </div>

                {projects.length > 1 && (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => removeProject(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </section>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Generating CV...' : 'Generate CV'}
          </button>

          {error && <div className="creator-error">{error}</div>}
        </form>

        <aside className="creator-output">
          <h2>Generated CV</h2>

          {!result && !loading && (
            <div className="creator-placeholder">
              Your generated CV will appear here.
            </div>
          )}

          {loading && <div className="creator-placeholder">Generating...</div>}

          {result && (
            <>
              <div className="creator-stats">
                <span>Tokens Used: {result.tokens_used}</span>
                <span>Tokens Remaining: {result.tokens_remaining}</span>
              </div>

              <div className="creator-markdown">
                <pre>{result.content_markdown}</pre>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

export default CV