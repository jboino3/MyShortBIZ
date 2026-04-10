import React, { useState } from "react";
import "./style.scss";

function CVPortfolio() {
  const [profile] = useState({
    firstName: "Jane",
    lastName: "Doe",
    cityStateZip: "New York, NY 10001",
    phone: "555-123-4567",
    email: "jane.doe@example.com",
    summary: "Full-stack developer with 5 years of experience in React and Node.js.",
    experience: [
      { title: "Software Engineer", company: "TechCorp", startDate: "2020", endDate: "2023", description: "Developed frontend apps and APIs." }
    ],
    education: [
      { school: "State University", degree: "BSc Computer Science", location: "NY", field: "Computer Science", graduationDate: "2019" }
    ],
    skills: ["React", "Node.js", "TypeScript", "CSS"]
  });

  return (
    <div className="cv-portfolio">
      <section className="cv-portfolio__header">
        <h1>{profile.firstName} {profile.lastName}</h1>
        <p>{profile.cityStateZip}</p>
        <p>{profile.phone} | {profile.email}</p>
      </section>

      <section className="cv-portfolio__summary">
        <h2>Summary</h2>
        <p>{profile.summary}</p>
      </section>

      <section className="cv-portfolio__experience">
        <h2>Experience</h2>
        {profile.experience.map((exp, i) => (
          <div key={i} className="cv-portfolio__entry">
            <h3>{exp.title} @ {exp.company}</h3>
            <p>{exp.startDate} - {exp.endDate}</p>
            <p>{exp.description}</p>
          </div>
        ))}
      </section>

      <section className="cv-portfolio__education">
        <h2>Education</h2>
        {profile.education.map((edu, i) => (
          <div key={i} className="cv-portfolio__entry">
            <h3>{edu.degree} - {edu.field}</h3>
            <p>{edu.school}, {edu.location}</p>
            <p>Graduation: {edu.graduationDate}</p>
          </div>
        ))}
      </section>

      <section className="cv-portfolio__skills">
        <h2>Skills</h2>
        <div className="cv-portfolio__skills-list">
          {profile.skills.map((skill, i) => <span key={i}>{skill}</span>)}
        </div>
      </section>
    </div>
  );
}

export default CVPortfolio;