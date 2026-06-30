'use client';

import { useState } from 'react';
import { Plus, Trash2, Printer, Download, Loader2, Eye, EyeOff, User, Briefcase, GraduationCap, Wrench, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Types ────────────────────────────────────────────────────────
type Work = {
  id: string; company: string; position: string;
  startDate: string; endDate: string; current: boolean; description: string;
};
type Edu = {
  id: string; school: string; degree: string; field: string;
  startDate: string; endDate: string; current: boolean;
};
type LangEntry = { id: string; language: string; level: string };

type ResumeData = {
  name: string;
  fatherName: string;
  nrcNo: string;
  phone: string;
  email: string;
  address: string;
  linkedin: string;
  objective: string;
  work: Work[];
  education: Edu[];
  skills: string[];
  languages: LangEntry[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const newWork  = (): Work      => ({ id: uid(), company: '', position: '', startDate: '', endDate: '', current: false, description: '' });
const newEdu   = (): Edu       => ({ id: uid(), school: '', degree: '', field: '', startDate: '', endDate: '', current: false });
const newLang  = (): LangEntry => ({ id: uid(), language: '', level: 'Intermediate' });

const INITIAL: ResumeData = {
  name: '', fatherName: '', nrcNo: '',
  phone: '', email: '', address: '',
  linkedin: '', objective: '',
  work: [], education: [], skills: [], languages: [],
};

const LANG_LEVELS = ['Basic', 'Intermediate', 'Fluent', 'Native'];

const LANG_LEVEL_MY: Record<string, string> = {
  Basic:        'အခြေခံ',
  Intermediate: 'အလယ်အလတ်',
  Fluent:       'ကျွမ်းကျင်',
  Native:       'မိခင်ဘာသာ',
};

// ── Small helpers ────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    />
  );
}

function SelectLevel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { lang } = useLanguage();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      {LANG_LEVELS.map((l) => (
        <option key={l} value={l}>{lang === 'my' ? (LANG_LEVEL_MY[l] ?? l) : l}</option>
      ))}
    </select>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.FC<{ size?: number }>; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/10 dark:text-brand-400">
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-brand-500/40 hover:text-brand-600"
    >
      <Plus size={14} /> {label}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="text-muted-foreground transition-colors hover:text-danger"
    >
      <Trash2 size={14} />
    </button>
  );
}

// ── Resume preview template (A4-faithful inline styles) ──────────
function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{
        fontWeight: '700', fontSize: '9px', letterSpacing: '1.5px', color: '#1B3A6B',
        textTransform: 'uppercase', borderBottom: '1.5px solid #BFDBFE',
        paddingBottom: '3px', marginBottom: '6px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ResumePreview({ data, labels }: {
  data: ResumeData;
  labels: {
    summary: string; work: string; education: string; skills: string; languages: string;
    present: string; footer: string; namePlaceholder: string; fathersName: string; nrc: string;
  };
}) {
  const hasContact = data.phone || data.email || data.address || data.linkedin;

  return (
    <div
      id="resume-preview"
      style={{
        backgroundColor: '#fff',
        color: '#1a1a1a',
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: '11px',
        lineHeight: '1.6',
        padding: '22mm 18mm',
        minHeight: '297mm',
        width: '210mm',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Header ── */}
      <div style={{ borderBottom: '2.5px solid #1B3A6B', paddingBottom: '12px', marginBottom: '6px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
          {data.name || labels.namePlaceholder}
        </div>

        {(data.fatherName || data.nrcNo) && (
          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '10.5px', color: '#334155' }}>
            {data.fatherName && (
              <span><span style={{ color: '#64748b' }}>{labels.fathersName}:</span> <strong>{data.fatherName}</strong></span>
            )}
            {data.nrcNo && (
              <span><span style={{ color: '#64748b' }}>{labels.nrc}:</span> <strong>{data.nrcNo}</strong></span>
            )}
          </div>
        )}

        {hasContact && (
          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '10px', color: '#475569' }}>
            {data.phone   && <span>📱 {data.phone}</span>}
            {data.email   && <span>✉ {data.email}</span>}
            {data.address && <span>📍 {data.address}</span>}
            {data.linkedin && <span>🔗 {data.linkedin}</span>}
          </div>
        )}
      </div>

      {data.objective && (
        <PreviewSection title={labels.summary}>
          <p style={{ color: '#334155', marginTop: '2px' }}>{data.objective}</p>
        </PreviewSection>
      )}

      {data.work.length > 0 && (
        <PreviewSection title={labels.work}>
          {data.work.map((w) => (
            <div key={w.id} style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a' }}>{w.position || 'Job Title'}</span>
                  <span style={{ marginLeft: '8px', color: '#1B3A6B', fontWeight: '600', fontSize: '11px' }}>
                    @ {w.company || 'Company'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {w.startDate || '—'} – {w.current ? labels.present : (w.endDate || '—')}
                </span>
              </div>
              {w.description && (
                <p style={{ marginTop: '4px', color: '#475569', paddingLeft: '10px', borderLeft: '2px solid #BFDBFE' }}>
                  {w.description}
                </p>
              )}
            </div>
          ))}
        </PreviewSection>
      )}

      {data.education.length > 0 && (
        <PreviewSection title={labels.education}>
          {data.education.map((e) => (
            <div key={e.id} style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a' }}>
                    {e.degree || 'Degree'}{e.field ? ` in ${e.field}` : ''}
                  </span>
                  <span style={{ marginLeft: '8px', color: '#1B3A6B', fontWeight: '600', fontSize: '11px' }}>
                    {e.school || 'School / University'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {e.startDate || '—'} – {e.current ? labels.present : (e.endDate || '—')}
                </span>
              </div>
            </div>
          ))}
        </PreviewSection>
      )}

      {data.skills.length > 0 && (
        <PreviewSection title={labels.skills}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
            {data.skills.map((s) => (
              <span key={s} style={{
                background: '#EFF4FF', color: '#1B3A6B', borderRadius: '4px',
                padding: '2px 9px', fontSize: '10px', fontWeight: '600', border: '1px solid #BFDBFE',
              }}>
                {s}
              </span>
            ))}
          </div>
        </PreviewSection>
      )}

      {data.languages.length > 0 && (
        <PreviewSection title={labels.languages}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '5px' }}>
            {data.languages.map((l) => (
              <span key={l.id} style={{ fontSize: '11px' }}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{l.language || '—'}</span>
                {l.level && <span style={{ color: '#64748b' }}> · {l.level}</span>}
              </span>
            ))}
          </div>
        </PreviewSection>
      )}

      <div style={{
        marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '8px',
        fontSize: '9px', color: '#94a3b8', textAlign: 'center',
      }}>
        {labels.footer}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export function ResumeBuilder() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<ResumeData>(INITIAL);
  const [showPreview, setShowPreview] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Labels passed to the preview (so preview section headings also translate)
  const previewLabels = {
    summary:         t('rb_preview_section_summary'),
    work:            t('rb_preview_section_work'),
    education:       t('rb_preview_section_education'),
    skills:          t('rb_preview_section_skills'),
    languages:       t('rb_preview_section_languages'),
    present:         t('rb_preview_present'),
    footer:          t('rb_preview_footer'),
    namePlaceholder: t('rb_preview_name_placeholder'),
    fathersName:     t('rb_preview_fathers_name'),
    nrc:             t('rb_preview_nrc'),
  };

  function patch(p: Partial<ResumeData>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  function addWork()   { patch({ work: [...data.work, newWork()] }); }
  function delWork(id: string) { patch({ work: data.work.filter((w) => w.id !== id) }); }
  function setWork(id: string, field: keyof Work, value: string | boolean) {
    patch({ work: data.work.map((w) => w.id === id ? { ...w, [field]: value } : w) });
  }

  function addEdu()   { patch({ education: [...data.education, newEdu()] }); }
  function delEdu(id: string) { patch({ education: data.education.filter((e) => e.id !== id) }); }
  function setEdu(id: string, field: keyof Edu, value: string | boolean) {
    patch({ education: data.education.map((e) => e.id === id ? { ...e, [field]: value } : e) });
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || data.skills.includes(s)) return;
    patch({ skills: [...data.skills, s] });
    setSkillInput('');
  }
  function delSkill(s: string) { patch({ skills: data.skills.filter((sk) => sk !== s) }); }

  function addLangEntry()  { patch({ languages: [...data.languages, newLang()] }); }
  function delLangEntry(id: string) { patch({ languages: data.languages.filter((l) => l.id !== id) }); }
  function setLangEntry(id: string, field: keyof LangEntry, value: string) {
    patch({ languages: data.languages.map((l) => l.id === id ? { ...l, [field]: value } : l) });
  }

  function handlePrint() {
    const el = document.getElementById('resume-preview');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Resume — ${data.name || 'CV'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    body { background: #fff; }
  </style>
</head>
<body>${el.outerHTML}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  }

  async function handleDownloadPDF() {
    const el = document.getElementById('resume-preview');
    if (!el) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      if (imgH <= pdfH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, imgH);
      } else {
        const imgW = (canvas.width * pdfH) / canvas.height;
        pdf.addImage(imgData, 'PNG', (pdfW - imgW) / 2, 0, imgW, pdfH);
      }
      pdf.save(`${data.name || 'Resume'}.pdf`);
    } catch (err) {
      console.error('[ResumeBuilder] PDF generation failed:', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      {/* Page header — inside client component so it can translate */}
      <div className="no-print mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-400">
          <FileText size={12} /> {t('rb_badge')}
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {t('rb_headline')}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          {t('rb_sub')}
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ── Form Panel ── */}
        <div className={cn('flex-1 space-y-5 lg:max-w-[560px]', showPreview && 'hidden lg:block')}>

          {/* Personal Info */}
          <SectionCard title={t('rb_section_personal')} icon={User}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div className="sm:col-span-2">
                <Field label={t('rb_full_name')} required>
                  <Input
                    value={data.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder={lang === 'my' ? 'ဥပမာ ဦးအောင်ကိုကို' : 'e.g. Aung Ko Ko'}
                  />
                </Field>
              </div>

              <Field label={t('rb_father_name')}>
                <Input
                  value={data.fatherName}
                  onChange={(e) => patch({ fatherName: e.target.value })}
                  placeholder={lang === 'my' ? 'ဥပမာ ဦးကျော်ဇင်' : 'e.g. U Kyaw Zin'}
                />
              </Field>

              <Field label={t('rb_nrc')}>
                <Input
                  value={data.nrcNo}
                  onChange={(e) => patch({ nrcNo: e.target.value })}
                  placeholder="e.g. 12/MAKHANA(N)123456"
                />
              </Field>

              <Field label={t('rb_phone')}>
                <Input
                  value={data.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  placeholder="+959 77 000 0000"
                  type="tel"
                />
              </Field>

              <Field label={t('rb_email')}>
                <Input
                  value={data.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="you@example.com"
                  type="email"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label={t('rb_address')}>
                  <Input
                    value={data.address}
                    onChange={(e) => patch({ address: e.target.value })}
                    placeholder={lang === 'my' ? 'ဥပမာ အမှတ် ၁၂၃၊ ဗိုလ်ချုပ်လမ်း၊ ကျောက်တံတားမြို့နယ်၊ ရန်ကုန်' : 'No. 123, Bogyoke Road, Kyauktada Township, Yangon, Myanmar'}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label={t('rb_linkedin')}>
                  <Input
                    value={data.linkedin}
                    onChange={(e) => patch({ linkedin: e.target.value })}
                    placeholder="linkedin.com/in/your-profile"
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label={t('rb_summary')}>
                  <Textarea
                    value={data.objective}
                    onChange={(v) => patch({ objective: v })}
                    placeholder={lang === 'my'
                      ? 'ဥပမာ၊ အတွေ့အကြုံ ၃ နှစ်ရှိသော ဝဘ်ဆော့ဖ်ဝဲ အင်ဂျင်နီယာ…'
                      : 'e.g. Motivated software engineer with 3+ years of experience building web applications…'
                    }
                    rows={3}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* Work Experience */}
          <SectionCard title={t('rb_section_work')} icon={Briefcase}>
            {data.work.map((w, i) => (
              <div key={w.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{t('rb_position_n')} {i + 1}</span>
                  <RemoveBtn onClick={() => delWork(w.id)} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t('rb_job_title')}>
                    <Input
                      value={w.position}
                      onChange={(e) => setWork(w.id, 'position', e.target.value)}
                      placeholder={lang === 'my' ? 'ဥပမာ ဆော့ဖ်ဝဲ အင်ဂျင်နီယာ' : 'e.g. Software Engineer'}
                    />
                  </Field>
                  <Field label={t('rb_company')}>
                    <Input
                      value={w.company}
                      onChange={(e) => setWork(w.id, 'company', e.target.value)}
                      placeholder={lang === 'my' ? 'ဥပမာ ABC Co.' : 'e.g. ABC Co.'}
                    />
                  </Field>
                  <Field label={t('rb_start_date')}>
                    <Input
                      value={w.startDate}
                      onChange={(e) => setWork(w.id, 'startDate', e.target.value)}
                      placeholder="Jan 2022"
                    />
                  </Field>
                  <div>
                    <Field label={t('rb_end_date')}>
                      <Input
                        value={w.endDate}
                        onChange={(e) => setWork(w.id, 'endDate', e.target.value)}
                        placeholder="Dec 2023"
                        disabled={w.current}
                      />
                    </Field>
                    <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={w.current}
                        onChange={(e) => setWork(w.id, 'current', e.target.checked)}
                        className="rounded border-border"
                      />
                      {t('rb_currently_working')}
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label={t('rb_responsibilities')}>
                      <Textarea
                        value={w.description}
                        onChange={(v) => setWork(w.id, 'description', v)}
                        placeholder={lang === 'my'
                          ? 'ဥပမာ၊ အသုံးပြုသူ ၅ သောင်းကျော်သည့် e-commerce ပလက်ဖောင်းကို ဦးဆောင် တည်ဆောက်ခဲ့သည်…'
                          : 'e.g. Led development of e-commerce platform serving 50k+ users…'
                        }
                        rows={2}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
            <AddButton onClick={addWork} label={t('rb_add_work')} />
          </SectionCard>

          {/* Education */}
          <SectionCard title={t('rb_section_education')} icon={GraduationCap}>
            {data.education.map((e, i) => (
              <div key={e.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{t('rb_education_n')} {i + 1}</span>
                  <RemoveBtn onClick={() => delEdu(e.id)} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label={t('rb_school')}>
                      <Input
                        value={e.school}
                        onChange={(ev) => setEdu(e.id, 'school', ev.target.value)}
                        placeholder={lang === 'my' ? 'ဥပမာ ရန်ကုန်တက္ကသိုလ်' : 'e.g. University of Yangon'}
                      />
                    </Field>
                  </div>
                  <Field label={t('rb_degree')}>
                    <Input
                      value={e.degree}
                      onChange={(ev) => setEdu(e.id, 'degree', ev.target.value)}
                      placeholder={lang === 'my' ? 'ဥပမာ B.Sc.' : 'e.g. B.Sc.'}
                    />
                  </Field>
                  <Field label={t('rb_field')}>
                    <Input
                      value={e.field}
                      onChange={(ev) => setEdu(e.id, 'field', ev.target.value)}
                      placeholder={lang === 'my' ? 'ဥပမာ ကွန်ပျူတာသိပ္ပံ' : 'e.g. Computer Science'}
                    />
                  </Field>
                  <Field label={t('rb_start_year')}>
                    <Input value={e.startDate} onChange={(ev) => setEdu(e.id, 'startDate', ev.target.value)} placeholder="2018" />
                  </Field>
                  <div>
                    <Field label={t('rb_end_year')}>
                      <Input value={e.endDate} onChange={(ev) => setEdu(e.id, 'endDate', ev.target.value)} placeholder="2022" disabled={e.current} />
                    </Field>
                    <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={e.current}
                        onChange={(ev) => setEdu(e.id, 'current', ev.target.checked)}
                        className="rounded border-border"
                      />
                      {t('rb_currently_studying')}
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <AddButton onClick={addEdu} label={t('rb_add_education')} />
          </SectionCard>

          {/* Skills */}
          <SectionCard title={t('rb_section_skills')} icon={Wrench}>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                placeholder={t('rb_skill_placeholder')}
              />
              <Button type="button" onClick={addSkill} variant="outline" size="sm" className="shrink-0 rounded-xl">
                <Plus size={14} />
              </Button>
            </div>
            {data.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.skills.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-400">
                    {s}
                    <button onClick={() => delSkill(s)} aria-label={`Remove ${s}`} className="text-brand-400 transition-colors hover:text-brand-700 dark:hover:text-brand-300">×</button>
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Languages */}
          <SectionCard title={t('rb_section_languages')} icon={Globe}>
            {data.languages.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <Input
                  value={l.language}
                  onChange={(e) => setLangEntry(l.id, 'language', e.target.value)}
                  placeholder={t('rb_lang_placeholder')}
                  className="flex-1"
                />
                <SelectLevel value={l.level} onChange={(v) => setLangEntry(l.id, 'level', v)} />
                <RemoveBtn onClick={() => delLangEntry(l.id)} />
              </div>
            ))}
            <AddButton onClick={addLangEntry} label={t('rb_add_language')} />
          </SectionCard>

        </div>

        {/* ── Preview Panel ── */}
        <div className={cn('flex-1 lg:sticky lg:top-20 lg:self-start', !showPreview && 'hidden lg:block')}>

          {/* Action bar */}
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium text-foreground">{t('rb_preview_label')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('rb_preview_sub')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={handlePrint} size="sm" variant="outline" className="gap-1.5 rounded-xl">
                <Printer size={14} /> {t('rb_print')}
              </Button>
              <Button
                onClick={handleDownloadPDF}
                disabled={downloading}
                size="sm"
                className="gap-1.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/20"
              >
                {downloading
                  ? <><Loader2 size={14} className="animate-spin" /> {t('rb_generating')}</>
                  : <><Download size={14} /> {t('rb_download_pdf')}</>
                }
              </Button>
            </div>
          </div>

          {/* Scrollable preview */}
          <div className="overflow-auto rounded-xl border border-border shadow-sm bg-muted/20">
            <div style={{ transform: 'scale(0.62)', transformOrigin: 'top center', width: '210mm', marginLeft: 'auto', marginRight: 'auto' }}>
              <ResumePreview data={data} labels={previewLabels} />
            </div>
          </div>

        </div>

        {/* Mobile toggle */}
        <div className="fixed bottom-24 right-5 z-40 lg:hidden sm:right-6">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg transition-colors hover:bg-accent"
          >
            {showPreview
              ? <><EyeOff size={15} /> {t('rb_mobile_edit')}</>
              : <><Eye size={15} /> {t('rb_mobile_preview')}</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}
