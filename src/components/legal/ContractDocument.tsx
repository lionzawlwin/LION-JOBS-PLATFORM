import type { Company, AgencySettings } from '@/types';

interface Props {
  company:  Company;
  settings: AgencySettings;
}

export function ContractDocument({ company, settings }: Props) {
  const rate = company.commissionRatePct ?? settings.defaultCommissionRatePct;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-black print:p-0">
      <h1 className="mb-1 text-center text-xl font-bold">B2B Service Contract / စီးပွားရေးဝန်ဆောင်မှု စာချုပ်</h1>
      <p className="mb-6 text-center text-sm text-gray-600">Lion Jobs Agency — {today}</p>

      <section className="mb-4">
        <h2 className="font-semibold">1. Parties / စာချုပ်ပါဝင်သူများ</h2>
        <p className="text-sm">
          This agreement is between Lion Jobs Agency (&ldquo;the Agency&rdquo;) and {company.name} (&ldquo;the Client&rdquo;), contact: {company.contactPerson || '—'}.
        </p>
        <p className="text-sm">
          ဤစာချုပ်ကို Lion Jobs Agency (&ldquo;အေဂျင်စီ&rdquo;) နှင့် {company.name} (&ldquo;ဖောက်သည်&rdquo;) တို့အကြား ချုပ်ဆိုသည်။ ဆက်သွယ်ရမည့်သူ - {company.contactPerson || '—'}
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold">2. Commission / ဝန်ဆောင်မှုခ</h2>
        <p className="text-sm">
          The Agency shall charge a service commission equal to {rate}% of the placed candidate&apos;s basic monthly salary.
        </p>
        <p className="text-sm">
          အေဂျင်စီသည် ခန့်အပ်ပေးသည့် ကိုယ်စားလှယ်လောင်း၏ လစဉ်အခြေခံလစာ၏ {rate}% ကို ဝန်ဆောင်မှုခအဖြစ် ကောက်ခံပါမည်။
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold">3. Replacement Guarantee / အစားထိုးအာမခံချက်</h2>
        <p className="text-sm">
          Should the placed candidate resign or be terminated for cause within {settings.defaultGuaranteeDays} days of their start date, the Agency will provide one free replacement candidate at {settings.defaultReplacementCostMmk} MMK additional cost.
        </p>
        <p className="text-sm">
          ခန့်အပ်ခံရသူသည် အလုပ်စတင်ချိန်မှ ရက်ပေါင်း {settings.defaultGuaranteeDays} အတွင်း နှုတ်ထွက် (သို့) အကြောင်းပြချက်ဖြင့် ထုတ်ပယ်ခံရပါက အေဂျင်စီမှ ကိုယ်စားလှယ်လောင်းအသစ်တစ်ဦးကို ({settings.defaultReplacementCostMmk} MMK) ဖြင့် အစားထိုးပေးပါမည်။
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-semibold">4. Effective Date / စတင်အသက်ဝင်မည့်ရက်</h2>
        <p className="text-sm">This contract is effective as of {today}.</p>
      </section>

      <div className="grid grid-cols-2 gap-8 pt-10 text-sm">
        <div>
          <p className="mb-12 border-b border-black">&nbsp;</p>
          <p>Lion Jobs Agency — Signature / လက်မှတ်</p>
        </div>
        <div>
          <p className="mb-12 border-b border-black">&nbsp;</p>
          <p>{company.name} — Signature / လက်မှတ်</p>
        </div>
      </div>
    </div>
  );
}
