import React, { useState } from "react";
import "./style.scss";

function CVPortfolio() {
  const [profile] = useState({
    firstName: "Jane",
    lastName: "Doe",
    profilePic: "https://via.placeholder.com/150", // temporary placeholder
    location: "New York, NY",
    about: "Full-stack developer passionate about building scalable web apps.",
    experience: [
      { title: "Software Engineer", company: "TechCorp", startDate: "2020", endDate: "2023", description: "Built React apps and Node.js APIs." }
    ],
    education: [
      { school: "State University", degree: "BSc Computer Science", graduationDate: "2019" }
    ],
    skills: ["React", "Node.js", "TypeScript", "CSS"],
    testimonials: [
      { from: "John Smith", message: "Jane is an amazing developer!" }
    ],
    activity: [
      { type: "post", content: "Launched new portfolio website!" }
    ]
  });

  return (
    <div className="cv-portfolio">
      {/* Top section */}
      <div className="cv-portfolio__top">
        <img src={profile.profilePic} alt="Profile" className="cv-portfolio__pic" />
        <div className="cv-portfolio__intro">
          <h1>{profile.firstName} {profile.lastName}</h1>
          <p>{profile.location}</p>
          <p>{profile.about}</p>
        </div>
      </div>

      {/* Experience */}
      <section className="cv-portfolio__section">
        <h2>Experience</h2>
        {profile.experience.map((exp, i) => (
          <div key={i} className="cv-portfolio__entry">
            <h3>{exp.title} @ {exp.company}</h3>
            <p>{exp.startDate} - {exp.endDate}</p>
            <p>{exp.description}</p>
          </div>
        ))}
      </section>

      {/* Education */}
      <section className="cv-portfolio__section">
        <h2>Education</h2>
        {profile.education.map((edu, i) => (
          <div key={i} className="cv-portfolio__entry">
            <h3>{edu.degree}</h3>
            <p>{edu.school}</p>
            <p>Graduation: {edu.graduationDate}</p>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section className="cv-portfolio__section">
        <h2>Skills</h2>
        <div className="cv-portfolio__skills">
          {profile.skills.map((skill, i) => <span key={i}>{skill}</span>)}
        </div>
      </section>

      {/* Testimonials */}
      <section className="cv-portfolio__section">
        <h2>Testimonials</h2>
        {profile.testimonials.map((test, i) => (
          <div key={i} className="cv-portfolio__entry">
            <strong>{test.from}:</strong> {test.message}
          </div>
        ))}
      </section>

      {/* Activity */}
      <section className="cv-portfolio__section">
        <h2>Activity</h2>
        {profile.activity.map((act, i) => (
          <div key={i} className="cv-portfolio__entry">
            {act.content}
          </div>
        ))}
      </section>
    </div>
  );
}

export default CVPortfolio;