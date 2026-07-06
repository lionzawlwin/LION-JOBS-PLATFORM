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
  // Layer 16b: added for the Vietnam-Myanmar import/distribution venture's
  // warehouse/logistics hiring -- rides the existing job posting/filtering
  // pipeline rather than a parallel intake system.
  | 'Logistics & Distribution'
  | 'Other';

export type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Remote' | 'Hybrid';

export type ApplicationStatus = 'Applied' | 'Shortlisted' | 'Interview' | 'Hired';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyId?: string | null;
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
  // Self-Serve Featured Job Listing Boost. Null for both "never boosted"
  // and "featured at creation via PostJobForm's checkbox" -- only set by
  // activateJobBoost() once a boost invoice is paid, same featuredUntil
  // convention as companies.featuredUntil (0030).
  featuredUntil?: string | null;
  logoUrl?: string;
  applicationsCount?: number;
  deadline?: string;
  screeningQuestions?: ScreeningQuestion[];
  viewCount?: number;
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
  finalAgreedSalary?: number;
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
  statusUpdatedAt: string;
  status: string;
  claimedByCseRepId: string | null;
  claimedAt: string | null;
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
  isInternal:    boolean;
  commissionRatePct?: number | null;
  // Layer 12 (Multi-Brand Account Grouping). Null = standalone account,
  // exactly today's behavior for every pre-existing row.
  parentAccountId: string | null;
  // Layer 13 (Plan Tiers & Usage Metering). Null = no plan assigned, which
  // means unmetered/no gating -- exactly today's behavior for every
  // pre-existing row until a plan is deliberately assigned.
  planId: string | null;
  // Featured Employer Placement -- staff-toggled (updateCompanyFeatured) or
  // set by a paid, timed placement (activateFeaturedPlacement). featuredUntil
  // is null for both "never featured" and "featured manually, no expiry";
  // it's only set for a paid placement, so the expiry cron only ever
  // touches those.
  isFeatured: boolean;
  featuredUntil: string | null;
}

// Layer 13 (Plan Tiers & Usage Metering).
export interface AccountPlan {
  id:               string;
  name:             string;
  jobSlotLimit:     number | null; // null = unlimited
  cseHoursIncluded: number | null;
  priceMmk:         number | null;
}

export interface PlanUsage {
  plan:        AccountPlan | null;
  jobSlotsUsed: number;
  atCapacity:  boolean;
}

export interface CompanyPlanUsageRow {
  companyId:    string;
  companyName:  string;
  planId:       string | null;
  planName:     string | null;
  jobSlotLimit: number | null;
  jobSlotsUsed: number;
  atCapacity:   boolean;
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

export type StaffRole = 'owner' | 'admin' | 'cse' | 'viewer';

export interface Staff {
  id:        string;
  email:     string;
  name:      string;
  role:      StaffRole;
  active:    boolean;
  cseRepId:  string | null;
  createdAt: string;
}

export interface EnterpriseStats {
  totalActiveContractValue: number;
  activeContractsCount:     number;
  enterpriseAccountsCount:  number;
  topCse: { id: string; name: string; value: number } | null;
}

// Layer 11 (Client Health Score). Only computed for accounts with an active
// commercial relationship ('Active'/'In-Contract') -- Leads haven't started
// engaging yet and Inactive accounts are already churned, so neither is
// "at risk" in the sense this exists to catch.
export type HealthBand = 'green' | 'yellow' | 'red';

export interface ClientHealthAccount {
  companyId:   string;
  companyName: string;
  band:        HealthBand;
  daysSinceLastContact: number | null;
}

export interface ClientHealthSummary {
  accounts: ClientHealthAccount[];
  counts: Record<HealthBand, number>;
}

export interface AgencySettings {
  defaultCommissionRatePct: number;
  defaultGuaranteeDays: number;
  defaultReplacementCostMmk: number;
  antiBypassPenaltyMmk: number;
  antiBypassRestrictionMonths: number;
  termsVersion: string;
  // Self-Serve Featured Placement Upsell pricing -- owner-editable via the
  // Billing tab's FeaturedPlacementSettingsPanel, PATCH /api/featured-placement-settings.
  featuredPlacementPriceMmk: number;
  featuredPlacementDurationDays: number;
  // Self-Serve Featured Job Listing Boost pricing -- separate product from
  // the company-level placement above, owner-editable via the Billing
  // tab's JobBoostSettingsPanel, PATCH /api/job-boost-settings.
  jobBoostPriceMmk: number;
  jobBoostDurationDays: number;
}

export interface ConsentRecord {
  id: string;
  applicationId: string;
  termsVersion: string;
  agreedAt: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string | null;
  companyName: string;
  applicationId: string | null;
  candidateName: string;
  position: string;
  agreedSalary: number;
  commissionRatePct: number;
  commissionFeeMmk: number;
  status: InvoiceStatus;
  issuedAt: string;
  createdAt: string;
}

export type PaymentMethod = 'bank_transfer' | 'kbzpay' | 'wavepay' | 'cash' | 'other';

export interface Payment {
  id: string;
  invoiceId: string;
  amountMmk: number;
  method: PaymentMethod;
  paidAt: string;
  recordedBy: string;
  notes: string | null;
  createdAt: string;
}

export type FailureCategory = 'webhook' | 'ai_scoring' | 'invoicing' | 'cron' | 'other' | 'rate_limit' | 'plan_upgrade' | 'featured_placement' | 'job_boost';
export type EventLevel = 'error' | 'info';

export interface SystemEvent {
  id: string;
  category: FailureCategory;
  level: EventLevel;
  route: string;
  message: string;
  context: Record<string, string | number | boolean | null> | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface CronStatus {
  route: string;
  lastRunAt: string;
  ok: boolean;
  message: string;
}

export interface StatsHistoryEntry {
  snapshotDate: string;
  jobsCount: number;
  candidatesCount: number;
  companiesCount: number;
  hiredCount: number;
}

export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: AuditAction;
  domain: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export type JobRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface JobRequest {
  id: string;
  companyId: string;
  title: string;
  location: string;
  category: JobCategory;
  type: JobType;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  description: string;
  requirements: string[];
  status: JobRequestStatus;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionNote: string | null;
}

export type NotificationType = 'job_request' | 'system_event' | 'unclaimed_lead' | 'contract_expiring';

// `href` mirrors TabDomain's literal values without importing from
// `@/lib/permissions` -- that module imports StaffRole from this file, and
// this file has no imports of its own (avoid a types <-> permissions cycle).
export type NotificationTargetTab =
  | 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies'
  | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns' | 'legal'
  | 'billing' | 'team' | 'system-health';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  href: NotificationTargetTab;
  createdAt: string;
}

export type SearchEntityType = 'candidate' | 'company' | 'job' | 'lead' | 'job_request';

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  href: NotificationTargetTab;
}

export interface CsePerformanceRow {
  cseRepId: string;
  name: string;
  activeContractsCount: number;
  activeContractValue: number;
  assignedCompaniesCount: number;
  claimedLeadsCount: number;
  // Layer 16: count of this rep's assigned companies currently in the red
  // health band (Layer 11) -- surfaces overloaded/neglected books of
  // business before they churn, not just deal volume.
  atRiskAccountsCount: number;
}
