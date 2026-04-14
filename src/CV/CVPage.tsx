import React from "react";
import Sidebar from "./Sidebar.tsx";
import './style.scss';
import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";

function CVPage() {
  return (
    <div className="cv-page">

      {/* Sidebar */}
      {/* <Sidebar /> */}

      {/* Main content area */}
      <main className="cv-page__content">

        <header className="cv-page__header">
          <h1 className="cv-page__title">myshort.cv</h1>
          <p className="cv-page__description">
            A streamlined resume and portfolio builder designed for modern creators, freelancers, and tech professionals. Select from sleek, mobile-optimized templates and export to PDF or publish online. Supports dynamic sections like client testimonials, portfolio embeds, or skills visualizations.
          </p>
        </header>

        {/* Resume Options */}
        <section className="cv-section cv-section--resume-options">
          <h2 className="cv-section__title">Resume Options</h2>
          <div className="cv-section__actions">
           
              <button className="cv-btn cv-btn--primary">
                Upload Existing Resume (PDF, DocX, TXT)
              </button>
  
            <Link to="/cv/builder">
              <button className="cv-btn cv-btn--secondary">
                Create Resume from Scratch
              </button>
            </Link>
          </div>
        </section>

        {/* Portfolio Section */}
        <section className="cv-section cv-section--portfolio">
          <h2 className="cv-section__title">Portfolio</h2>
          <p className="cv-section__description">
            Add projects, client testimonials, or embed portfolio links.
          </p>
          <Link to="/cv/portfolio">
            <button className="cv-btn cv-btn--primary">Create Portfolio</button>
          </Link>
           {/* <button className="cv-btn cv-btn--primary">Create Portfolio</button> */}
        </section>

        <div className="cv-outlet-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default CVPage;