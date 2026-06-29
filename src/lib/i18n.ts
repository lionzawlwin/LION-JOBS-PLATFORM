export type Lang = 'en' | 'my';

export const translations = {
  en: {
    // Navbar
    nav_find_jobs:      'Find Jobs',
    nav_resume:         'Resume Builder',
    nav_dashboard:      'Dashboard',
    nav_browse:         'Browse Jobs',
    nav_lang_toggle:    'မြန်မာ',

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

    // Apply form
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
  },

  my: {
    // Navbar
    nav_find_jobs:      'အလုပ်ရှာပါ',
    nav_resume:         'CV ဆောက်ပါ',
    nav_dashboard:      'ထိန်းချုပ်ခန်း',
    nav_browse:         'အလုပ်များကြည့်ပါ',
    nav_lang_toggle:    'English',

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

    // Apply form
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
  },
} satisfies Record<Lang, Record<string, string>>;

export type TranslationKey = keyof typeof translations.en;
