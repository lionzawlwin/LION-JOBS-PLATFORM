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

// Employer Applicant Visibility (Company Portal). Deliberately a separate,
// minimal type from Candidate -- not a subset selected in the API route --
// so the accessor function that produces it (getApplicantsForJob in
// db/candidates.ts) can only ever query these columns, never accidentally
// leak email/phone/salary/AI-score/notes through this employer-facing
// surface via a future refactor of the full Candidate query. See the repo
// owner's explicit decision on this boundary (name + resume only, no
// contact info -- the agency stays the required intermediary for contact).
export type ContactUnlockStatus = 'none' | 'pending' | 'paid';

export interface EmployerVisibleApplicant {
  id: string;
  name: string;
  stage: ApplicationStatus;
  appliedAt: string;
  cvUrl: string | null;
  // Direct-Contact-Info Upsell Tier (2026-07-07). directContactConsent is
  // the candidate's own opt-in (captured at application time); phone/email
  // are populated ONLY when contactUnlockStatus === 'paid' for the
  // requesting company -- getApplicantsForJob() enforces this at the
  // query layer, same discipline as the rest of this type's fields.
  directContactConsent: boolean;
  contactUnlockStatus: ContactUnlockStatus;
  phone: string | null;
  email: string | null;
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

// Job Alert Subscriptions (CTO big-upgrades roadmap, Item #2): a saved
// search a candidate wants emailed about daily. Criteria fields
// deliberately mirror JobFilters/GetJobsPaginatedOptions minus
// salaryMax -- this is framed as a salary floor to be alerted above, not
// a ceiling.
export interface JobAlertSubscription {
  id:               string;
  email:            string;
  keyword:          string | null;
  category:         JobCategory | '' | null;
  type:             JobType | '' | null;
  location:         string | null;
  salaryMin:        number | null;
  unsubscribeToken: string;
  active:           boolean;
  lastSentAt:       string | null;
  createdAt:        string;
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
  // Direct-Contact-Info Upsell Tier pricing -- no duration, unlike the two
  // above, since an unlock doesn't expire.
  contactUnlockPriceMmk: number;
}

export interface ConsentRecord {
  id: string;
  applicationId: string;
  termsVersion: string;
  agreedAt: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

// CTO Technical Audit Phase 5: a real discriminator + structured payload
// for the four charge types invoices now covers, replacing the old
// "parse a tag out of `position`" convention (companyRules.ts/jobRules.ts's
// former parse*() functions, migration 0033). `position` itself is kept --
// it's still the human-readable line-item text -- charge_type/metadata
// are what code should branch on now.
export type InvoiceChargeType = 'candidate_placement' | 'plan_upgrade' | 'featured_placement' | 'job_boost' | 'contact_unlock';

export interface PlanUpgradeInvoiceMetadata {
  planName: string;
}
export interface FeaturedPlacementInvoiceMetadata {
  durationDays: number;
}
export interface JobBoostInvoiceMetadata {
  jobId: string;
  durationDays: number;
}
export interface ContactUnlockInvoiceMetadata {
  applicationId: string;
}

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
  chargeType: InvoiceChargeType;
  metadata: PlanUpgradeInvoiceMetadata | FeaturedPlacementInvoiceMetadata | JobBoostInvoiceMetadata | ContactUnlockInvoiceMetadata | null;
}

// Commercial/Revenue Overview dashboard (Billing tab). Paid-invoice totals
// bucketed by product line -- each line is identified by parsing the same
// Invoice.position tags each creation path already writes (see
// companyRules.ts/jobRules.ts and the 'Plan Upgrade — ' prefix), not a new
// invoice.type column. activeFeaturedCompanies/activeBoostedJobs count
// companies.is_featured/jobs.is_featured currently true (whether set via a
// paid placement or a manual staff toggle) -- what's actually live on the
// public site right now, not just the paid subset.
export interface RevenueSummary {
  totalPaidMmk: number;
  byLine: {
    candidatePlacementMmk: number;
    planUpgradeMmk: number;
    featuredPlacementMmk: number;
    jobBoostMmk: number;
    contactUnlockMmk: number;
  };
  activeFeaturedCompanies: number;
  activeBoostedJobs: number;
  pendingRequests: {
    planUpgrade: number;
    featuredPlacement: number;
    jobBoost: number;
    contactUnlock: number;
  };
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

export type FailureCategory = 'webhook' | 'ai_scoring' | 'invoicing' | 'cron' | 'other' | 'rate_limit' | 'plan_upgrade' | 'featured_placement' | 'job_boost' | 'contact_unlock';
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
