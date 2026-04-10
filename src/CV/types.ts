export interface Experience {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface Education {
  school: string;
  degree: string;
  location: string;
  fieldOfStudy: string;
  graduationDate: string;
}

export interface PortfolioProfile {
  firstName: string;
  lastName: string;
  cityStateZip: string;
  phone: string;
  email: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
}