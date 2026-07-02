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
  interviewLocation?: string;
  interviewerContact?: string;
  needsConsent?: boolean;
  source?: string;
  // extended profile fields
  cityLocation?: string;
  education?: string;
  experienceYears?: string;
  currentCompany?: string;
  currentSalary?: string;
  languages?: string;
  skills?: string;
  portfolioUrl?: string;
  // AI scoring fields (populated asynchronously after submission)
  aiSummary?:   string;
  aiReasoning?: string;
  aiProcessedAt?: string;
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

export type CompanyStatus = 'Lead' | 'Active' | 'In-Contract' | 'Inactive';
export type CompanyTier = 'smb' | 'enterprise';

export interface Company {
  id:            string;
  name:          string;
  contactPerson: string;
  email:         string;
  phone:         string;
  industry:      string;
  city:          string;
  status:        CompanyStatus;
  tier:          CompanyTier;
  notes:         string;
  lastContacted: string;
  createdAt:     string;
  commissionRatePct?: number | null;
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

export type ContractType = 'Retainer' | 'Contingency' | 'Exclusive' | 'Other';
export type ContractStatus = 'Draft' | 'Active' | 'Completed' | 'Terminated';

export interface Contract {
  id:           string;
  companyId:    string;
  value:        number;
  currency:     string;
  contractType: ContractType;
  status:       ContractStatus;
  startDate:    string | null;
  endDate:      string | null;
  cseId:        string | null;
  notes:        string;
  createdAt:    string;
}

export type InteractionType = 'Call' | 'Email' | 'Meeting' | 'Demo' | 'Contract Sent' | 'Other';

export interface Interaction {
  id:            string;
  companyId:     string;
  type:          InteractionType;
  note:          string;
  loggedByCseId: string | null;
  occurredAt:    string;
  createdAt:     string;
}

export interface CseRep {
  id:        string;
  name:      string;
  phone:     string;
  email:     string;
  active:    boolean;
  createdAt: string;
}

export interface EnterpriseStats {
  totalActiveContractValue: number;
  activeContractsCount:     number;
  enterpriseAccountsCount:  number;
  topCse: { id: string; name: string; value: number } | null;
}

export interface AgencySettings {
  defaultCommissionRatePct: number;
  defaultGuaranteeDays: number;
  defaultReplacementCostMmk: number;
  antiBypassPenaltyMmk: number;
  antiBypassRestrictionMonths: number;
  termsVersion: string;
}

export interface ConsentRecord {
  id: string;
  applicationId: string;
  termsVersion: string;
  agreedAt: string;
}
