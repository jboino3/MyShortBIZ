// Bio.tsx
import React from 'react';
import './Bio.scss';

const Bio: React.FC = () => {
  return (
    <main className="bio-page">
      <div className="content-wrapper">
        <section className="bio-card">
          <h2>MyShort.Bio Profile</h2>
          <p>Customize your centralized and trackable links/content embeds</p>
          
          {/* Requirement: Placeholder for AI API stuff */}
          <div className="ai-placeholder">
            another AI placeholder until implementation
          </div>
        </section>

        <section className="bio-card">
          <h3>Active Links</h3>
          <div className="link-list">
             {/* Future map of user links */}
             <p>No links added yet. Pages support unlimited links and social icons.</p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Bio;