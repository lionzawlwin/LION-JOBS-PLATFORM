export type JobCategory =
  | 'Engineering'
  | 'Design'
  | 'Marketing'
  | 'Sales'
  | 'Finance'
  | 'Operations'
  | 'Customer Service'
  | 'Healthcare'
  | 'Education'
  | 'Other';

export type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Remote' | 'Hybrid';

export type ApplicationStatus = 'Applied' | 'Shortlisted' | 'Interview' | 'Hired';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  category: JobCategory;
  type: JobType;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  description: string;
  requirements: string[];
  benefits?: string[];
  postedAt: string;
  isUrgent?: boolean;
  isFeatured?: boolean;
  logoUrl?: string;
  applicationsCount?: number;
  deadline?: string;
  screeningQuestions?: ScreeningQuestion[];
}

export interface ScreeningQuestion {
  id:       string;
  question: string;
  type:     'yes_no' | 'text' | 'number';
  required: boolean;
  knockout?: boolean;
  expected?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone: string;
  position: string;
  jobId?: string;
  company?: string;
  cvUrl?: string;
  linkedinUrl?: string;
  matchScore: number;
  stage: ApplicationStatus;
  appliedAt: string;
  notes?: string;
  salaryExpected?: string;
  interviewDate?: string;
  source?: string;
  // extended profile fields (cols Y-AF)
  cityLocation?: string;
  education?: string;
  experienceYears?: string;
  currentCompany?: string;
  currentSalary?: string;
  languages?: string;
  skills?: string;
  portfolioUrl?: string;
}

export interface B2bLead {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  website: string;
  contactName: string;
  contactTitle: string;
  workEmail: string;
  phone: string;
  jobTitle: string;
  headcount: string;
  workSetup: string;
  salaryBudget: string;
  urgency: string;
  requirements: string;
  agencyMessage: string;
  jobDescription: string;
  benefits: string;
  submittedAt: string;
  status: string;
}

export interface JobFilters {
  keyword: string;
  category: JobCategory | '';
  location: string;
  salaryMin: number;
  salaryMax: number;
  type: JobType | '';
}

export type CompanyStatus = 'Lead' | 'Client' | 'Inactive';

export interface Company {
  id:            string;
  name:          string;
  contactPerson: string;
  email:         string;
  phone:         string;
  industry:      string;
  city:          string;
  status:        CompanyStatus;
  notes:         string;
  lastContacted: string;
  createdAt:     string;
}

export interface ApplicationPayload {
  fullName: string;
  email?: string;
  phone: string;
  position: string;
  jobId?: string;
  cvBase64?: string;
  cvFileName?: string;
  linkedinUrl?: string;
}
