export interface PortfolioProfile {
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  about: string;

  experience: {
    role: string;
    company: string;
    duration: string;
    description: string;
  }[];

  education: {
    school: string;
    degree: string;
    year: string;
  }[];

  skills: string[];
}

export const mockProfile: PortfolioProfile = {
  firstName: "John",
  lastName: "Doe",
  headline: "Software Engineer",
  location: "Phoenix, AZ",
  about: "Passionate developer building modern web applications.",

  experience: [
    {
      role: "Frontend Developer",
      company: "Tech Corp",
      duration: "2022 - Present",
      description: "Built scalable React applications."
    }
  ],

  education: [
    {
      school: "Arizona State University",
      degree: "B.S. Computer Science",
      year: "2024"
    }
  ],

  skills: ["React", "TypeScript", "CSS", "Node.js"]
};