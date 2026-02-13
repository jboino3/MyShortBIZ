// src/pages/CV.tsx
import './CVstyle.scss'

function CV() {

  return (
    <>
    <main className="page">
      <section className="intro-block">
        <h1>Create a CV or Portfolio in Minutes</h1>
        <p>
          No design skills needed. Make use of built-in templates to streamline
          the process and create a polished CV or portfolio that stands out. 
        </p>
      </section>

      <section className="block">
        <div className="resume-layout">
            <h2>Professional Resume Builder</h2>
            <p>
              Create ATS-friendly resumes used by students,  
              developers, and professionals.
            </p>

            <ul>
              <li>✓ Export to PDF</li>
              <li>✓ Clean modern templates</li>
              <li>✓ No account required</li>
            </ul>

            <div className="btn-group">
              <button className="primary-btn">Create Resume</button>
              <button className="secondary-btn">Upload Existing Resume</button>
            </div>
          </div>
       
          <div className="portfolio-layout">
            <h2>Portfolio Website</h2>

            <p>
              Showcase projects, skills, and testimonials  
              with beautiful templates.
            </p>

            <ul>
              <li>✓ Project galleries</li>
              <li>✓ Custom sections</li>
              <li>✓ Publish online</li>
            </ul>

            <div className="btn-group">
              <button className="primary-btn">Create Portfolio</button>
            </div>
          </div>
        </section>

    </main>
    
    </>
  )
}

export default CV
