import type { TabDomain } from '@/lib/permissions';
import type { TranslationKey } from '@/lib/i18n';

// Reuses the existing admin_banner_* i18n keys (the one-line "what is this
// tab" description already shown above every tab) instead of duplicating
// that text here.
export const BANNER_KEYS: Record<TabDomain, TranslationKey> = {
  overview:        'admin_banner_overview',
  candidates:      'admin_banner_candidates',
  'post-job':      'admin_banner_post_job',
  'manage-jobs':   'admin_banner_manage_jobs',
  companies:       'admin_banner_companies',
  enterprise:      'admin_banner_enterprise',
  'b2b-leads':     'admin_banner_b2b_leads',
  content:         'admin_banner_content',
  campaigns:       'admin_banner_campaigns',
  legal:           'admin_banner_legal',
  billing:         'admin_banner_billing',
  team:            'admin_banner_team',
  'system-health': 'admin_banner_system_health',
};

interface RelatedTab {
  tab: TabDomain;
  reasonKey: TranslationKey;
}

interface TabHelp {
  tipKeys: TranslationKey[];
  related: RelatedTab[];
}

// One "next step" per tab, not an exhaustive map -- a single well-chosen
// related tab beats a wall of links nobody reads. Related tabs are
// additionally filtered against the viewer's actual visible-tab list at
// render time (TabHelpPanel), since a role that can't see e.g. Billing
// shouldn't be offered a shortcut to it.
export const DASHBOARD_HELP: Record<TabDomain, TabHelp> = {
  overview: {
    tipKeys: ['help_tip_overview_1', 'help_tip_overview_2'],
    related: [{ tab: 'candidates', reasonKey: 'help_related_overview_candidates' }],
  },
  candidates: {
    tipKeys: ['help_tip_candidates_1', 'help_tip_candidates_2'],
    related: [{ tab: 'billing', reasonKey: 'help_related_candidates_billing' }],
  },
  'post-job': {
    tipKeys: ['help_tip_post_job_1', 'help_tip_post_job_2'],
    related: [{ tab: 'manage-jobs', reasonKey: 'help_related_post_job_manage_jobs' }],
  },
  'manage-jobs': {
    tipKeys: ['help_tip_manage_jobs_1', 'help_tip_manage_jobs_2'],
    related: [{ tab: 'post-job', reasonKey: 'help_related_manage_jobs_post_job' }],
  },
  companies: {
    tipKeys: ['help_tip_companies_1', 'help_tip_companies_2'],
    related: [{ tab: 'enterprise', reasonKey: 'help_related_companies_enterprise' }],
  },
  enterprise: {
    tipKeys: ['help_tip_enterprise_1', 'help_tip_enterprise_2'],
    related: [{ tab: 'companies', reasonKey: 'help_related_enterprise_companies' }],
  },
  'b2b-leads': {
    tipKeys: ['help_tip_b2b_leads_1', 'help_tip_b2b_leads_2'],
    related: [{ tab: 'companies', reasonKey: 'help_related_b2b_leads_companies' }],
  },
  content: {
    tipKeys: ['help_tip_content_1', 'help_tip_content_2'],
    related: [{ tab: 'campaigns', reasonKey: 'help_related_content_campaigns' }],
  },
  campaigns: {
    tipKeys: ['help_tip_campaigns_1', 'help_tip_campaigns_2'],
    related: [{ tab: 'content', reasonKey: 'help_related_campaigns_content' }],
  },
  legal: {
    tipKeys: ['help_tip_legal_1', 'help_tip_legal_2'],
    related: [{ tab: 'billing', reasonKey: 'help_related_legal_billing' }],
  },
  billing: {
    tipKeys: ['help_tip_billing_1', 'help_tip_billing_2'],
    related: [{ tab: 'candidates', reasonKey: 'help_related_billing_candidates' }],
  },
  team: {
    tipKeys: ['help_tip_team_1', 'help_tip_team_2'],
    related: [{ tab: 'system-health', reasonKey: 'help_related_team_system_health' }],
  },
  'system-health': {
    tipKeys: ['help_tip_system_health_1', 'help_tip_system_health_2'],
    related: [{ tab: 'team', reasonKey: 'help_related_system_health_team' }],
  },
};
