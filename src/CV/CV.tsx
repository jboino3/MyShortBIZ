import { Link } from "react-router-dom";

import "./style.scss";

function CV() {
  return (
    <main className="cv-page__content">
      <header className="cv-page__header">
        <h1 className="cv-page__title">myshort.cv</h1>
        <p className="cv-page__description">
          Build a resume or portfolio with the CV tools available in this workspace.
        </p>
      </header>

      <section className="cv-section cv-section--resume-options">
        <h2 className="cv-section__title">Resume Options</h2>
        <div className="cv-section__actions">
          <Link to="/cv/builder">
            <button className="cv-btn cv-btn--secondary">Create Resume from Scratch</button>
          </Link>
          <Link to="/cv/portfolio">
            <button className="cv-btn cv-btn--primary">Create Portfolio</button>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default CV;
