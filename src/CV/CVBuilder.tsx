import React, { useState } from "react";
import "./style.scss";

interface CVData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;

  summary: string;

  experiences: {
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description: string;
  }[];

  education: {
    school: string;
    degree: string;
    location: string;
    fieldOfStudy: string;
    graduationDate: string;
  }[];

  skills: string[];
}

function CVBuilder() {
  const [cvData, setCvData] = useState<CVData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    zip: "",
    summary: "",
    experiences: [
      { title: "", company: "", startDate: "", endDate: "", description: "" },
    ],
    education: [
      {
        school: "",
        degree: "",
        location: "",
        fieldOfStudy: "",
        graduationDate: "",
      },
    ],
    skills: [],
  });

  const [skillInput, setSkillInput] = useState("");

  const handleEducationChange = (index: number, field: string, value: string) => {
    const updated = [...cvData.education];
    updated[index] = { ...updated[index], [field]: value };
    setCvData({ ...cvData, education: updated });
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      setCvData({ ...cvData, skills: [...cvData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const handleDeleteSkill = (skill: string) => {
    setCvData({
      ...cvData,
      skills: cvData.skills.filter((s) => s !== skill),
    });
  };

  const handleGenerateResume = () => {
    console.log(cvData);
    alert("Resume generated (mock)");
  };

  return (
    <div className="cv-builder">
      <h1>Resume Builder</h1>

      {/* Header */}
      <section className="cv-builder__section">
        <h2>Header</h2>

        <div className="cv-row">
          <input
            placeholder="First Name"
            value={cvData.firstName}
            onChange={(e) =>
              setCvData({ ...cvData, firstName: e.target.value })
            }
          />
          <input
            placeholder="Last Name"
            value={cvData.lastName}
            onChange={(e) =>
              setCvData({ ...cvData, lastName: e.target.value })
            }
          />
        </div>

        <div className="cv-row">
          <input
            placeholder="City"
            value={cvData.city}
            onChange={(e) =>
              setCvData({ ...cvData, city: e.target.value })
            }
          />
          <input
            placeholder="State"
            value={cvData.state}
            onChange={(e) =>
              setCvData({ ...cvData, state: e.target.value })
            }
          />
          <input
            placeholder="Zip Code"
            value={cvData.zip}
            onChange={(e) =>
              setCvData({ ...cvData, zip: e.target.value })
            }
          />
        </div>

        <input
          placeholder="Phone Number"
          value={cvData.phone}
          onChange={(e) =>
            setCvData({ ...cvData, phone: e.target.value })
          }
        />

        <input
          placeholder="Email"
          value={cvData.email}
          onChange={(e) =>
            setCvData({ ...cvData, email: e.target.value })
          }
        />
      </section>

      {/* Education */}
      <section className="cv-builder__section">
        <h2>Education</h2>

        {cvData.education.map((edu, i) => (
          <div key={i} className="cv-builder__entry">
            <input
              placeholder="School Name"
              value={edu.school}
              onChange={(e) =>
                handleEducationChange(i, "school", e.target.value)
              }
            />

            <input
              placeholder="Degree"
              value={edu.degree}
              onChange={(e) =>
                handleEducationChange(i, "degree", e.target.value)
              }
            />

            <input
              placeholder="Location"
              value={edu.location}
              onChange={(e) =>
                handleEducationChange(i, "location", e.target.value)
              }
            />

            <input
              placeholder="Field of Study"
              value={edu.fieldOfStudy}
              onChange={(e) =>
                handleEducationChange(i, "fieldOfStudy", e.target.value)
              }
            />

            <input
              type="month"
              value={edu.graduationDate}
              onChange={(e) =>
                handleEducationChange(i, "graduationDate", e.target.value)
              }
            />
          </div>
        ))}
      </section>

      {/* Skills */}
      <section className="cv-builder__section">
        <h2>Skills</h2>

        <input
          placeholder="Type a skill and press Enter"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={handleAddSkill}
        />

        <div className="cv-builder__skills">
          {cvData.skills.map((skill, i) => (
            <span key={i} onClick={() => handleDeleteSkill(skill)}>
              {skill} ×
            </span>
          ))}
        </div>
      </section>

      <button
        className="cv-builder__generate-btn"
        onClick={handleGenerateResume}
      >
        Generate Resume
      </button>
    </div>
  );
}

export default CVBuilder;