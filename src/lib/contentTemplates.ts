export type PostPlatform = 'facebook' | 'telegram' | 'whatsapp' | 'linkedin';
export type PostTone     = 'professional' | 'casual' | 'urgent';
export type PostType     =
  | 'job_announcement'
  | 'urgent_hiring'
  | 'talent_pool_promo'
  | 'company_spotlight'
  | 'career_tip'
  | 'employer_outreach';

export interface TemplateVars {
  title?:       string;
  company?:     string;
  location?:    string;
  salary?:      string;
  type?:        string;
  category?:    string;
  applyUrl?:    string;
  phone?:       string;
  requirement1?: string;
  requirement2?: string;
  requirement3?: string;
  tipTitle?:    string;
  tipBody?:     string;
  contactName?: string;
  companyName?: string;
}

type TemplateSet = Record<PostPlatform, string>;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

function fill(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = (vars as Record<string, string | undefined>)[key];
    return val ?? `[${key}]`;
  });
}

const templates: Record<PostType, Record<PostTone, TemplateSet>> = {

  job_announcement: {
    professional: {
      facebook: `✨ NEW OPPORTUNITY — {title}

We are delighted to announce an exciting new vacancy at {company}.

📍 Location: {location}
💼 Type: {type}
💰 Salary: {salary}

Key requirements:
• {requirement1}
• {requirement2}
• {requirement3}

Apply directly at {applyUrl}
or send your CV to our team at 📞 {phone}

#LionJobs #Myanmar #JobVacancy #{category}`,

      telegram: `📋 New Job: {title}
🏢 {company} | 📍 {location}
💰 {salary} | 📋 {type}

✅ {requirement1}
✅ {requirement2}

👉 {applyUrl}`,

      whatsapp: `Hello! 👋

We have a new job opening:

*{title}* at *{company}*
📍 {location}  💰 {salary}

Requirements:
• {requirement1}
• {requirement2}

Apply here: {applyUrl}
Or reply to this message! 😊`,

      linkedin: `Exciting opportunity! 🚀

{company} is looking for a talented {title} to join their growing team in {location}.

What you'll bring:
✔ {requirement1}
✔ {requirement2}
✔ {requirement3}

Salary: {salary} | Type: {type}

Apply via Lion Jobs Agency: {applyUrl}

#Hiring #Myanmar #JobSearch #{category}`,
    },

    casual: {
      facebook: `Hey friends! 🙌 Know someone perfect for this role?

💼 {title} at {company}
📍 {location}  💰 {salary}

What they need:
✅ {requirement1}
✅ {requirement2}
✅ {requirement3}

Share this post — you might change someone's life! ❤️
👉 Apply: {applyUrl}
📞 Call us: {phone}

#LionJobs #Myanmar #{category}`,

      telegram: `🙌 Hey! New job just dropped!

{title} — {company}
📍 {location}  💰 {salary}

👉 {applyUrl}
📞 {phone}`,

      whatsapp: `Hi! 🎉 We just posted a great job!

*{title}*
{company} · {location}
💰 {salary}

Interested? Click: {applyUrl}
Or just reply here! 📩`,

      linkedin: `New opportunity alert! 🔔

We're helping {company} find their next {title}.

📍 {location}  |  💰 {salary}  |  🗂 {type}

Quick requirements:
• {requirement1}
• {requirement2}

Tag someone who'd be perfect! 👇
Apply: {applyUrl}`,
    },

    urgent: {
      facebook: `🔥 URGENT HIRING — {title} 🔥

{company} needs someone IMMEDIATELY in {location}!

💰 {salary} | ⏰ Start ASAP

Requirements:
🔹 {requirement1}
🔹 {requirement2}

DON'T MISS THIS — Apply NOW 👇
{applyUrl}

📞 Call us immediately: {phone}
⏳ Limited spots available!

#UrgentHiring #LionJobs #Myanmar`,

      telegram: `🚨 URGENT! {title}
🏢 {company} | 📍 {location}
💰 {salary} — Start ASAP!

Call NOW: {phone}
Apply: {applyUrl}`,

      whatsapp: `🚨 *URGENT JOB ALERT* 🚨

*{title}* — {company}
📍 {location}  💰 {salary}
⏰ *Start IMMEDIATELY*

Requirements: {requirement1}

👆 Apply NOW: {applyUrl}
📞 Contact us: {phone}`,

      linkedin: `⚡ URGENT: Seeking a {title} immediately

{company} in {location} needs to fill this role ASAP.

Salary: {salary}
Type: {type}

Requirements:
• {requirement1}
• {requirement2}

Apply immediately: {applyUrl}

#UrgentHiring #Myanmar #{category}`,
    },
  },

  urgent_hiring: {
    professional: {
      facebook: `🔥 URGENT VACANCY ALERT

We are urgently seeking qualified candidates for the position of {title} at {company}.

📍 {location}  💰 {salary}  ⏰ Immediate start

Candidates with the following are encouraged to apply:
✔ {requirement1}
✔ {requirement2}

Contact Lion Jobs Agency immediately:
📞 {phone}
🌐 {applyUrl}

#UrgentHiring #LionJobs #Myanmar`,
      telegram: `🔥 URGENT: {title} at {company}\n📍 {location} | 💰 {salary}\nContact: {phone}`,
      whatsapp: `🔥 *URGENT* — {title}\n{company} | {location}\n💰 {salary}\n📞 Call: {phone}`,
      linkedin: `Urgent talent requirement: {title}\n{company} | {location}\n{salary} | Immediate join\nApply: {applyUrl}`,
    },
    casual:       { facebook: '', telegram: '', whatsapp: '', linkedin: '' },
    urgent:       { facebook: '', telegram: '', whatsapp: '', linkedin: '' },
  },

  talent_pool_promo: {
    professional: {
      facebook: `🦁 Join Lion Jobs Agency's Talent Pool!

Not seeing your dream job today? Don't worry — we're always connecting talented people with top companies in Myanmar.

✅ Submit your CV once
✅ We match you when the right role opens
✅ 100% FREE for candidates
✅ Confidential & secure

👉 Drop your CV now: ${SITE_URL}/drop-cv

Our expert recruiters are ready to help you find the perfect opportunity.

#LionJobs #TalentPool #Myanmar #CareerGrowth`,

      telegram: `🦁 No job match today? Join our Talent Pool!

Drop your CV → We contact you when the right job opens.

100% free for candidates.
👉 ${SITE_URL}/drop-cv`,

      whatsapp: `Hi! 👋

Not finding the right job? Join our *Talent Pool*!

✅ Drop your CV once
✅ We'll contact you when a matching job opens
✅ Completely free!

Link: ${SITE_URL}/drop-cv`,

      linkedin: `Are you a talented professional in Myanmar waiting for the right opportunity?

Join Lion Jobs Agency's Talent Pool today.

✔ One-time CV submission
✔ Matched with relevant roles as they open
✔ Zero cost for candidates

We work with 50+ companies across Myanmar. Your next career move could be one step away.

Submit your CV: ${SITE_URL}/drop-cv

#Myanmar #CareerOpportunity #TalentPool #LionJobs`,
    },
    casual: {
      facebook: `Hey! 👋 Don't see a job for you? That's okay!

Drop your CV in our Talent Pool and let US find you the perfect job! 🎯

${SITE_URL}/drop-cv

It's 100% FREE and we never spam. Promise! 🤝

#LionJobs #Myanmar`,
      telegram: `👋 No job match? Drop your CV!\n${SITE_URL}/drop-cv\nFree & confidential!`,
      whatsapp: `Hey! 😊 Can't find the right job?\n\nJoin our Talent Pool — it's free!\n👉 ${SITE_URL}/drop-cv`,
      linkedin: '',
    },
    urgent: {
      facebook: `⏰ Companies are hiring NOW — Are you in our Talent Pool?\n\nDon't miss out! ${SITE_URL}/drop-cv`,
      telegram: `⏰ Hiring season is here! Join our Talent Pool NOW:\n${SITE_URL}/drop-cv`,
      whatsapp: `⏰ Don't miss opportunities! Drop your CV now:\n${SITE_URL}/drop-cv`,
      linkedin: '',
    },
  },

  company_spotlight: {
    professional: {
      facebook: `🏢 COMPANY SPOTLIGHT — {companyName}

We're proud to partner with {companyName}, one of Myanmar's leading employers.

{companyName} is currently hiring talented professionals to join their growing team.

🌟 Why work with {companyName}?
✔ Competitive salary packages
✔ Professional growth opportunities
✔ Great team culture

👉 View all openings: ${SITE_URL}

#LionJobs #Myanmar #CompanySpotlight #{companyName}`,
      telegram: `🏢 {companyName} is hiring!\nSee their openings: ${SITE_URL}\n#LionJobs`,
      whatsapp: `🏢 *{companyName}* has exciting openings!\nCheck them out: ${SITE_URL}`,
      linkedin: `Spotlight on {companyName} — an excellent employer in Myanmar.\nExplore their vacancies at Lion Jobs: ${SITE_URL}`,
    },
    casual:   { facebook: '', telegram: '', whatsapp: '', linkedin: '' },
    urgent:   { facebook: '', telegram: '', whatsapp: '', linkedin: '' },
  },

  career_tip: {
    professional: {
      facebook: `💡 CAREER TIP — {tipTitle}

{tipBody}

At Lion Jobs Agency, we believe that career success is about more than just finding a job — it's about finding the RIGHT job.

📱 Browse opportunities: ${SITE_URL}
📞 Speak to our team: {phone}

#CareerTip #LionJobs #Myanmar #JobSearch`,
      telegram: `💡 Career Tip: {tipTitle}\n\n{tipBody}\n\nMore jobs: ${SITE_URL}`,
      whatsapp: `💡 *Career Tip*\n\n*{tipTitle}*\n\n{tipBody}\n\nFind your next job: ${SITE_URL}`,
      linkedin: `Career Insight: {tipTitle}\n\n{tipBody}\n\nExploring new opportunities? Browse our latest openings: ${SITE_URL}\n\n#CareerAdvice #Myanmar #JobSearch`,
    },
    casual: {
      facebook: `Hey job seekers! 🙋 Quick tip for you:\n\n✨ {tipTitle}\n\n{tipBody}\n\nShare with a friend who needs this! 🤝\n${SITE_URL}`,
      telegram: `✨ Quick tip!\n{tipTitle}\n\n{tipBody}`,
      whatsapp: `✨ *Quick career tip!*\n\n{tipTitle}\n\n{tipBody}`,
      linkedin: '',
    },
    urgent: { facebook: '', telegram: '', whatsapp: '', linkedin: '' },
  },

  employer_outreach: {
    professional: {
      facebook: '',
      telegram: '',
      whatsapp: `Dear {contactName},\n\nI hope this message finds you well.\n\nI'm reaching out from *Lion Jobs Agency*, Myanmar's leading recruitment firm. We specialise in connecting top talent with forward-thinking companies like {companyName}.\n\nWe currently have pre-vetted candidates available for:\n• Engineering & IT roles\n• Sales & Marketing positions\n• Finance & Operations\n• And many more\n\nOur service is *free for employers* for the initial placement discussion. We handle all screening, so you only meet the best candidates.\n\nWould you be open to a brief call this week to discuss your hiring needs?\n\nBest regards,\nLion Jobs Agency Team\n📞 {phone}\n🌐 ${SITE_URL}`,
      linkedin:  `Hi {contactName},\n\nI noticed {companyName} is growing — congratulations on your success!\n\nI'm from Lion Jobs Agency, and we specialise in finding top talent across Myanmar. We've placed candidates at 50+ companies and pride ourselves on quality over quantity.\n\nWould you be open to connecting to discuss your upcoming hiring needs?\n\nBest regards,\nLion Jobs Agency`,
    },
    casual:   { facebook: '', telegram: '', whatsapp: '', linkedin: '' },
    urgent:   { facebook: '', telegram: '', whatsapp: '', linkedin: '' },
  },
};

export function generateContent(
  type:     PostType,
  platform: PostPlatform,
  tone:     PostTone,
  vars:     TemplateVars,
): string {
  const tmpl = templates[type]?.[tone]?.[platform] ?? '';
  if (!tmpl) return `Template not yet available for ${type} / ${tone} / ${platform}.`;
  return fill(tmpl, {
    ...vars,
    phone:    vars.phone    ?? process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '09-428-954-289',
    applyUrl: vars.applyUrl ?? `${SITE_URL}/apply`,
  });
}

export const POST_TYPES: { value: PostType; label: string; emoji: string }[] = [
  { value: 'job_announcement', label: 'Job Announcement',   emoji: '📢' },
  { value: 'urgent_hiring',    label: 'Urgent Hiring',      emoji: '🔥' },
  { value: 'talent_pool_promo',label: 'Talent Pool Promo',  emoji: '🦁' },
  { value: 'company_spotlight',label: 'Company Spotlight',  emoji: '🏢' },
  { value: 'career_tip',       label: 'Career Tip',         emoji: '💡' },
  { value: 'employer_outreach',label: 'Employer Outreach',  emoji: '🤝' },
];

export const PLATFORMS: { value: PostPlatform; label: string; color: string }[] = [
  { value: 'facebook',  label: 'Facebook',  color: 'text-blue-600' },
  { value: 'telegram',  label: 'Telegram',  color: 'text-sky-500' },
  { value: 'whatsapp',  label: 'WhatsApp',  color: 'text-emerald-600' },
  { value: 'linkedin',  label: 'LinkedIn',  color: 'text-blue-700' },
];

export const TONES: { value: PostTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual',       label: 'Casual & Friendly' },
  { value: 'urgent',       label: 'Urgent & Action-Driven' },
];
