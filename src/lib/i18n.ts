export type Lang = 'en' | 'my';

export const translations = {
  en: {
    // Navbar
    nav_find_jobs:      'Find Jobs',
    nav_resume:         'Resume Builder',
    nav_dashboard:      'Dashboard',
    nav_browse:         'Browse Jobs',
    nav_lang_toggle:    'မြန်မာ',
    nav_my_apps:        'My Applications',
    nav_drop_cv:        'Drop Your CV',

    // Talent Pool
    talent_pool_headline:        'Join Our Talent Pool',
    talent_pool_sub:             "Don't see the right job? Drop your CV and we'll reach out as soon as a matching role opens.",
    talent_pool_desired_title:   'Desired Job Title',
    talent_pool_category:        'Desired Category',
    talent_pool_expected_salary: 'Expected Salary (MMK/month, optional)',
    talent_pool_submit:          'Join Talent Pool',
    talent_pool_success_title:   "You're in Our Talent Pool!",
    talent_pool_success_sub:     "We'll contact you as soon as a matching position opens up. Keep an eye on your phone.",

    // Application status page
    status_title:       'Track Your Applications',
    status_placeholder: 'Enter your email or phone number',
    status_check_btn:   'Check Status',
    status_no_results:  'No applications found. Try a different email or phone.',
    status_privacy:     'We only show your own applications. Your data is never shared.',

    // Hero
    hero_badge:         "Myanmar's #1 Job Agency",
    hero_headline:      'Find Your Dream Job in Myanmar',
    hero_sub:           'Browse hundreds of vetted positions. Apply in minutes. Our expert team matches you with roles that fit your skills and salary expectations.',
    hero_search_placeholder: 'Job title, company, or keyword…',
    hero_search_btn:    'Search',
    hero_stat_roles:    'open roles',
    hero_stat_companies:'partner companies',
    hero_stat_free:     'Free for candidates',

    // Job card / listing
    apply_now:          'Apply Now',
    negotiable:         'Negotiable',
    per_month:          'per month',
    urgent:             'Urgent',
    featured:           'Featured',
    back_to_jobs:       'Back to all jobs',

    // Apply form — personal tab
    form_full_name:     'Full Name',
    form_email:         'Email Address',
    form_phone:         'Phone Number',
    form_position:      'Applied Position',
    form_portfolio:     'Portfolio / CV',
    form_upload_cv:     'Upload CV',
    form_linkedin:      'LinkedIn URL',
    form_submit:        'Submit Application',
    form_submitting:    'Submitting…',
    form_consent:       'By submitting, you agree that Lion Jobs Agency may share your details with the hiring company.',
    form_city:          'City / Township',
    // Apply form — experience tab
    form_education:         'Highest Education',
    form_select_education:  'Select education level…',
    form_experience:        'Years of Experience',
    form_select_experience: 'Select experience…',
    form_current_company:   'Current / Last Employer',
    form_current_salary:    'Current Salary (MMK/month)',
    form_notice_period:     'Notice Period',
    form_select_notice:     'Select notice period…',
    form_languages:         'Languages Spoken',
    form_skills:            'Key Skills',
    form_skills_hint:       'Separate skills with commas',
    // Apply form — documents tab
    form_expected_salary:   'Expected Salary (MMK/month)',
    form_portfolio_url:     'Portfolio / Website URL',
    // Apply form — navigation & misc
    form_next:              'Next',
    form_back:              'Back',
    form_quick_apply:       '⚡ Quick Apply',
    form_welcome_back:      'returning applicant',
    form_use_saved:         'Use Saved Profile',
    form_tab_personal:      'Personal',
    form_tab_experience:    'Experience',
    form_tab_documents:     'Documents',

    // Success modal
    modal_title:        'Application Submitted!',
    modal_sub:          'has been received. Our team will review it and reach out within 48 hours.',
    modal_followup:     'Follow up via',

    // Job alerts
    alerts_title:       'Get Job Alerts on Telegram',
    alerts_sub:         'Subscribe to our Telegram channel and be the first to know when new jobs match your category.',
    alerts_category:    'Category',
    alerts_subscribe:   'Subscribe on Telegram',
    alerts_all:         'All Categories',
    alerts_note:        'Free. Unsubscribe anytime.',

    // Hero CTA cards
    hero_drop_cv_title:   'Drop Your CV — No Job Required',
    hero_drop_cv_sub:     'Join our talent pool. We\'ll match you when the perfect job arrives. Free & no spam.',
    hero_hire_title:      'Looking to Hire? Tell Us Your Needs',
    hero_hire_sub:        'Find pre-vetted talent for your company — free employer consultation, fast turnaround.',

    // Resume Builder — page header
    rb_badge:           'Free Resume Builder',
    rb_headline:        'Build Your Professional Resume',
    rb_sub:             'Fill in your details on the left. Your resume updates instantly on the right. Click Print to open the print dialog, or Download PDF to save the file directly — no account needed.',
    rb_preview_label:   'Resume Preview',
    rb_preview_sub:     'Print or save directly as a PDF file',
    // Resume Builder — section titles
    rb_section_personal:   'Personal Information',
    rb_section_work:       'Work Experience',
    rb_section_education:  'Education',
    rb_section_skills:     'Skills',
    rb_section_languages:  'Languages',
    // Resume Builder — personal fields
    rb_full_name:     'Full Name',
    rb_father_name:   "Father's Name",
    rb_nrc:           'National ID Card No. (NRC)',
    rb_phone:         'Phone Number',
    rb_email:         'Email Address',
    rb_address:       'Full Address',
    rb_linkedin:      'LinkedIn URL',
    rb_summary:       'Professional Summary',
    // Resume Builder — work fields
    rb_job_title:          'Job Title',
    rb_company:            'Company',
    rb_start_date:         'Start Date',
    rb_end_date:           'End Date',
    rb_currently_working:  'Currently working here',
    rb_responsibilities:   'Key Responsibilities',
    rb_add_work:           'Add Work Experience',
    rb_position_n:         'Position',
    // Resume Builder — education fields
    rb_school:             'School / University',
    rb_degree:             'Degree',
    rb_field:              'Field of Study',
    rb_start_year:         'Start Year',
    rb_end_year:           'End Year',
    rb_currently_studying: 'Currently studying',
    rb_add_education:      'Add Education',
    rb_education_n:        'Education',
    // Resume Builder — skills & languages
    rb_skill_placeholder:  'Type a skill and press Enter…',
    rb_lang_placeholder:   'e.g. English',
    rb_add_language:       'Add Language',
    // Resume Builder — actions
    rb_print:          'Print',
    rb_download_pdf:   'Download PDF',
    rb_generating:     'Generating…',
    rb_mobile_edit:    'Edit',
    rb_mobile_preview: 'Preview',
    // Resume Builder — preview document text
    rb_preview_section_summary:   'Professional Summary',
    rb_preview_section_work:      'Work Experience',
    rb_preview_section_education: 'Education',
    rb_preview_section_skills:    'Skills',
    rb_preview_section_languages: 'Languages',
    rb_preview_present:           'Present',
    rb_preview_footer:            'Resume prepared with Lion Jobs Agency · lionjobsagency.com',
    rb_preview_name_placeholder:  'Your Full Name',
    rb_preview_fathers_name:      "Father's Name",
    rb_preview_nrc:               'NRC No.',

    // Email alerts
    email_alerts_title:       'Get Job Alerts by Email',
    email_alerts_sub:         'Be the first to know when new jobs match your skills. We send only the good stuff.',
    email_alerts_placeholder: 'Your email address',
    email_alerts_btn:         'Subscribe',
    email_alerts_success:     "You're subscribed! New jobs will land in your inbox.",
    email_alerts_error:       'Could not subscribe. Please try again.',
  },

  my: {
    // Navbar
    nav_find_jobs:      'အလုပ်ရှာပါ',
    nav_resume:         'CV ဆောက်ပါ',
    nav_dashboard:      'ထိန်းချုပ်ခန်း',
    nav_browse:         'အလုပ်များကြည့်ပါ',
    nav_lang_toggle:    'English',
    nav_my_apps:        'ကျွန်ုပ်၏ လျှောက်လွှာများ',
    nav_drop_cv:        'CV ထည့်ပါ',

    // Talent Pool
    talent_pool_headline:        'Talent Pool တွင် ပါဝင်ပါ',
    talent_pool_sub:             'သင့်နှင့် ကိုက်ညီသောအလုပ် မတွေ့ပါသလား? CV ထည့်ပြီး ကိုက်ညီသောရာထူး ရရှိသောအခါ ဆက်သွယ်ပေးပါမည်။',
    talent_pool_desired_title:   'လိုချင်သောရာထူး',
    talent_pool_category:        'လိုချင်သောအမျိုးအစား',
    talent_pool_expected_salary: 'မျှော်မှန်းလစာ (MMK/လ၊ ရွေးချယ်နိုင်)',
    talent_pool_submit:          'Talent Pool တွင် ပါဝင်ပါ',
    talent_pool_success_title:   'Talent Pool တွင် ပါဝင်ပြီးပါပြီ!',
    talent_pool_success_sub:     'ကိုက်ညီသောရာထူး ရောက်သည်နှင့် ဆက်သွယ်ပေးပါမည်။ ဖုန်းကို မျက်စိပွင့်ပြီး ကြည့်ပါ။',

    // Application status page
    status_title:       'လျှောက်လွှာ စစ်ဆေးပါ',
    status_placeholder: 'အီးမေးလ် သို့ ဖုန်းနံပါတ် ထည့်ပါ',
    status_check_btn:   'စစ်ဆေးပါ',
    status_no_results:  'လျှောက်လွှာ မတွေ့ပါ။ အီးမေးလ် သို့ ဖုန်းနံပါတ် ပြန်စစ်ပါ။',
    status_privacy:     'သင်၏ လျှောက်လွှာများသာ ပြပါမည်။ ဒေတာ မျှဝေမည် မဟုတ်ပါ။',

    // Hero
    hero_badge:         'မြန်မာ့ အကောင်းဆုံး အလုပ်ရှာဖွေရေး',
    hero_headline:      'မြန်မာနိုင်ငံတွင် သင်၏ အိပ်မက်အလုပ်ကို ရှာဖွေပါ',
    hero_sub:           'စစ်ဆေးပြီးသော အလုပ်ရာထူးများ ကြည့်ရှုပါ။ မိနစ်ပိုင်းအတွင်း လျှောက်ထားနိုင်သည်။',
    hero_search_placeholder: 'အလုပ်ခေါင်းစဉ်၊ ကုမ္ပဏီ သို့ မဟုတ် သော့ချက်စကားလုံး…',
    hero_search_btn:    'ရှာဖွေပါ',
    hero_stat_roles:    'ဖွင့်လှစ်ထားသော ရာထူးများ',
    hero_stat_companies:'မိတ်ဖက်ကုမ္ပဏီများ',
    hero_stat_free:     'လျှောက်ထားသူများအတွက် အခမဲ့',

    // Job card / listing
    apply_now:          'လျှောက်ထားပါ',
    negotiable:         'ညှိနှိုင်းနိုင်',
    per_month:          'တစ်လလျှင်',
    urgent:             'အရေးပေါ်',
    featured:           'အထူးသတိပြု',
    back_to_jobs:       'အလုပ်အားလုံးသို့ ပြန်',

    // Apply form — personal tab
    form_full_name:     'အမည်အပြည့်အစုံ',
    form_email:         'အီးမေးလ်လိပ်စာ',
    form_phone:         'ဖုန်းနံပါတ်',
    form_position:      'လျှောက်ထားသည့် ရာထူး',
    form_portfolio:     'CV / အတွေ့အကြုံ',
    form_upload_cv:     'CV တင်ပြပါ',
    form_linkedin:      'LinkedIn လင့်ခ်',
    form_submit:        'လျှောက်လွှာ တင်ပါ',
    form_submitting:    'တင်သွင်းနေသည်…',
    form_consent:       'တင်ပြခြင်းဖြင့် Lion Jobs Agency မှ သင်၏အချက်အလက်ကို ငှားရမ်းသူနှင့် မျှဝေနိုင်ကြောင်း သဘောတူသည်။',
    form_city:          'မြို့ / မြို့နယ်',
    // Apply form — experience tab
    form_education:         'အမြင့်ဆုံးပညာအရည်အချင်း',
    form_select_education:  'ပညာရည် ရွေးချယ်ပါ…',
    form_experience:        'အလုပ်သက်တမ်း',
    form_select_experience: 'အတွေ့အကြုံ ရွေးချယ်ပါ…',
    form_current_company:   'လက်ရှိ / နောက်ဆုံး လုပ်ခဲ့သောကုမ္ပဏီ',
    form_current_salary:    'လက်ရှိလစာ (MMK/လ)',
    form_notice_period:     'အသိပေးကာလ',
    form_select_notice:     'အသိပေးကာလ ရွေးချယ်ပါ…',
    form_languages:         'တတ်ကျွမ်းသောဘာသာစကားများ',
    form_skills:            'အဓိကကျွမ်းကျင်မှုများ',
    form_skills_hint:       'ကော်မာဖြင့် ခွဲခြားပါ',
    // Apply form — documents tab
    form_expected_salary:   'မျှော်မှန်းလစာ (MMK/လ)',
    form_portfolio_url:     'Portfolio / ဝဘ်ဆိုဒ် URL',
    // Apply form — navigation & misc
    form_next:              'ရှေ့သို့',
    form_back:              'နောက်သို့',
    form_quick_apply:       '⚡ အမြန်လျှောက်ထားရန်',
    form_welcome_back:      'ကြိုဆိုပါသည်',
    form_use_saved:         'သိမ်းဆည်းထားသောပရိုဖိုင် သုံးပါ',
    form_tab_personal:      'ကိုယ်ရေးအချက်',
    form_tab_experience:    'အတွေ့အကြုံ',
    form_tab_documents:     'စာရွက်စာတမ်း',

    // Success modal
    modal_title:        'လျှောက်လွှာ တင်ပြပြီးပါပြီ!',
    modal_sub:          'ရရှိပြီးဖြစ်ပါသည်။ ကျွန်ုပ်တို့အဖွဲ့မှ ၄၈ နာရီအတွင်း ဆက်သွယ်ပါမည်။',
    modal_followup:     'ဆက်သွယ်ရန်',

    // Job alerts
    alerts_title:       'Telegram မှ အလုပ်သတိပေးချက် ရယူပါ',
    alerts_sub:         'ကျွန်ုပ်တို့ Telegram ချန်နယ်သို့ ဝင်ရောက်ပြီး သင်ရွေးချယ်သည့် အမျိုးအစားအတွက် အသစ်ဖွင့်သည့် အလုပ်များကို ဦးဆုံးသိရှိပါ။',
    alerts_category:    'အမျိုးအစား',
    alerts_subscribe:   'Telegram တွင် ဝင်ရောက်ပါ',
    alerts_all:         'အမျိုးအစားအားလုံး',
    alerts_note:        'အခမဲ့။ မည်သည့်အချိန်မဆို ဖြုတ်သိမ်းနိုင်သည်။',

    // Hero CTA cards
    hero_drop_cv_title:   'CV ကြိုတင်ဖြည့်သွင်းရန်',
    hero_drop_cv_sub:     'သင့်အတွက် ကိုက်ညီမည့် အလုပ်အကိုင်များကို ကျွန်ုပ်တို့ ရှာဖွေပေးပါမည်။',
    hero_hire_title:      'ဝန်ထမ်းခန့်အပ်ရန် တင်ပြပါ',
    hero_hire_sub:        'အရည်အချင်းပြည့်ဝသော ဝန်ထမ်းများကို အမြန်ဆုံး ချိတ်ဆက်ပေးပါမည်။',

    // Resume Builder — page header
    rb_badge:           'CV အခမဲ့ ဆောက်ပါ',
    rb_headline:        'ကျွမ်းကျင်သော CV တည်ဆောက်ပါ',
    rb_sub:             'ဘယ်ဘက်တွင် သင်၏ အချက်အလက်များ ဖြည့်ပါ။ ညာဘက်တွင် CV ချက်ချင်း ပြသမည်။ Print နှိပ်ပါ သို့ PDF ဒေါင်းလုဒ် ဆွဲပါ — အကောင့် မလိုအပ်ပါ။',
    rb_preview_label:   'CV အကြိုကြည့်ရှု',
    rb_preview_sub:     'ပုံနှိပ်ပါ သို့ PDF ဖိုင်အဖြစ် သိမ်းဆည်းပါ',
    // Resume Builder — section titles
    rb_section_personal:   'ကိုယ်ရေးကိုယ်တာ အချက်အလက်',
    rb_section_work:       'အလုပ်အကိုင် သမိုင်းကြောင်း',
    rb_section_education:  'ပညာရေး',
    rb_section_skills:     'ကျွမ်းကျင်မှုများ',
    rb_section_languages:  'ဘာသာစကားများ',
    // Resume Builder — personal fields
    rb_full_name:     'အမည်အပြည့်အစုံ',
    rb_father_name:   'အဖအမည်',
    rb_nrc:           'မှတ်ပုံတင် (NRC)',
    rb_phone:         'ဖုန်းနံပါတ်',
    rb_email:         'အီးမေးလ်လိပ်စာ',
    rb_address:       'နေရပ်လိပ်စာ',
    rb_linkedin:      'LinkedIn URL',
    rb_summary:       'ကိုယ်ရေးအကျဉ်း',
    // Resume Builder — work fields
    rb_job_title:          'ရာထူး',
    rb_company:            'ကုမ္ပဏီ',
    rb_start_date:         'စတင်သည့်ရက်',
    rb_end_date:           'ပြီးဆုံးသည့်ရက်',
    rb_currently_working:  'လက်ရှိ ဤနေရာတွင် အလုပ်လုပ်နေသည်',
    rb_responsibilities:   'အဓိကတာဝန်ဝတ္တရားများ',
    rb_add_work:           'အလုပ်သမိုင်း ထပ်ထည့်ပါ',
    rb_position_n:         'ရာထူး',
    // Resume Builder — education fields
    rb_school:             'ကျောင်း / တက္ကသိုလ်',
    rb_degree:             'ဘွဲ့',
    rb_field:              'ပညာသင်ဘာသာရပ်',
    rb_start_year:         'စတင်နှစ်',
    rb_end_year:           'ပြီးဆုံးနှစ်',
    rb_currently_studying: 'လက်ရှိ ပညာသင်ကြားနေသည်',
    rb_add_education:      'ပညာရေး ထပ်ထည့်ပါ',
    rb_education_n:        'ပညာရေး',
    // Resume Builder — skills & languages
    rb_skill_placeholder:  'ကျွမ်းကျင်မှု ရိုက်ထည့်ပြီး Enter နှိပ်ပါ…',
    rb_lang_placeholder:   'ဥပမာ မြန်မာဘာသာ',
    rb_add_language:       'ဘာသာစကား ထပ်ထည့်ပါ',
    // Resume Builder — actions
    rb_print:          'ပုံနှိပ်ပါ',
    rb_download_pdf:   'PDF ဒေါင်းလုဒ်',
    rb_generating:     'ဖန်တီးနေသည်…',
    rb_mobile_edit:    'ပြင်ဆင်ပါ',
    rb_mobile_preview: 'အကြိုကြည့်ပါ',
    // Resume Builder — preview document text
    rb_preview_section_summary:   'ကိုယ်ရေးအကျဉ်း',
    rb_preview_section_work:      'အလုပ်အကိုင် သမိုင်းကြောင်း',
    rb_preview_section_education: 'ပညာရေး',
    rb_preview_section_skills:    'ကျွမ်းကျင်မှုများ',
    rb_preview_section_languages: 'ဘာသာစကားများ',
    rb_preview_present:           'ယနေ့တိုင်',
    rb_preview_footer:            'Lion Jobs Agency မှ ပြုစုသော CV · lionjobsagency.com',
    rb_preview_name_placeholder:  'သင်၏ အမည်',
    rb_preview_fathers_name:      'အဖအမည်',
    rb_preview_nrc:               'မှတ်ပုံတင်',

    // Email alerts
    email_alerts_title:       'အီးမေးလ်ဖြင့် အလုပ်သတိပေးချက် ရယူပါ',
    email_alerts_sub:         'သင်၏ ကျွမ်းကျင်မှုနှင့် ကိုက်ညီသော အလုပ်အသစ်များ ရောက်သည်နှင့် ချက်ချင်းသိရှိပါ။',
    email_alerts_placeholder: 'အီးမေးလ်လိပ်စာ',
    email_alerts_btn:         'စာရင်းသွင်းပါ',
    email_alerts_success:     'စာရင်းသွင်းပြီးပါပြီ! အလုပ်အသစ်များ သင်၏ inbox တွင် ရောက်ပါမည်။',
    email_alerts_error:       'စာရင်းမသွင်းနိုင်ပါ။ ထပ်မံကြိုးစားပါ။',
  },
} satisfies Record<Lang, Record<string, string>>;

export type TranslationKey = keyof typeof translations.en;
