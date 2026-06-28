'use client';

import { useState } from 'react';
import { Plus, Trash2, Printer, Eye, EyeOff, User, Briefcase, GraduationCap, Wrench, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────
type Work = {
  id: string; company: string; position: string;
  startDate: string; endDate: string; current: boolean; description: string;
};
type Edu = {
  id: string; school: string; degree: string; field: string;
  startDate: string; endDate: string; current: boolean;
};
type Lang = { id: string; language: string; level: string };

type ResumeData = {
  name: string; phone: string; email: string; address: string;
  linkedin: string; objective: string;
  work: Work[];
  education: Edu[];
  skills: string[];
  languages: Lang[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const newWork  = (): Work => ({ id: uid(), company: '', position: '', startDate: '', endDate: '', current: false, description: '' });
const newEdu   = (): Edu  => ({ id: uid(), school: '', degree: '', field: '', startDate: '', endDate: '', current: false });
const newLang  = (): Lang => ({ id: uid(), language: '', level: 'Intermediate' });

const INITIAL: ResumeData = {
  name: '', phone: '', email: '', address: '', linkedin: '', objective: '',
  work: [], education: [], skills: [], languages: [],
};

const LANG_LEVELS = ['Basic', 'Intermediate', 'Fluent', 'Native'];

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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      {LANG_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
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

// ── Resume Preview (print-faithful) ─────────────────────────────
function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{
        fontWeight: '700', fontSize: '9px', letterSpacing: '1.5px', color: '#4f46e5',
        textTransform: 'uppercase', borderBottom: '1.5px solid #e0e7ff', paddingBottom: '3px', marginBottom: '6px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ResumePreview({ data }: { data: ResumeData }) {
  const hasContact = data.phone || data.email || data.address || data.linkedin;

  return (
    <div
      id="resume-preview"
      style={{
        backgroundColor: '#fff',
        color: '#1a1a1a',
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: '11px',
        lineHeight: '1.55',
        padding: '22mm 18mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '2.5px solid #4f46e5', paddingBottom: '12px', marginBottom: '4px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
          {data.name || 'Your Full Name'}
        </div>
        {hasContact && (
          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '10px', color: '#475569' }}>
            {data.phone   && <span>📱 {data.phone}</span>}
            {data.email   && <span>✉ {data.email}</span>}
            {data.address && <span>📍 {data.address}</span>}
            {data.linkedin && <span>🔗 {data.linkedin}</span>}
          </div>
        )}
      </div>

      {/* Summary */}
      {data.objective && (
        <PreviewSection title="Professional Summary">
          <p style={{ color: '#334155', marginTop: '2px' }}>{data.objective}</p>
        </PreviewSection>
      )}

      {/* Work */}
      {data.work.length > 0 && (
        <PreviewSection title="Work Experience">
          {data.work.map((w) => (
            <div key={w.id} style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a' }}>{w.position || 'Job Title'}</span>
                  <span style={{ marginLeft: '8px', color: '#4f46e5', fontWeight: '600', fontSize: '11px' }}>
                    @ {w.company || 'Company'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {w.startDate || '—'} – {w.current ? 'Present' : (w.endDate || '—')}
                </span>
              </div>
              {w.description && (
                <p style={{ marginTop: '4px', color: '#475569', paddingLeft: '10px', borderLeft: '2px solid #c7d2fe' }}>
                  {w.description}
                </p>
              )}
            </div>
          ))}
        </PreviewSection>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <PreviewSection title="Education">
          {data.education.map((e) => (
            <div key={e.id} style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a' }}>
                    {e.degree || 'Degree'}{e.field ? ` in ${e.field}` : ''}
                  </span>
                  <span style={{ marginLeft: '8px', color: '#4f46e5', fontWeight: '600', fontSize: '11px' }}>
                    {e.school || 'School / University'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {e.startDate || '—'} – {e.current ? 'Present' : (e.endDate || '—')}
                </span>
              </div>
            </div>
          ))}
        </PreviewSection>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <PreviewSection title="Skills">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
            {data.skills.map((s) => (
              <span key={s} style={{
                background: '#eef2ff', color: '#4338ca', borderRadius: '4px',
                padding: '2px 9px', fontSize: '10px', fontWeight: '600', border: '1px solid #c7d2fe',
              }}>
                {s}
              </span>
            ))}
          </div>
        </PreviewSection>
      )}

      {/* Languages */}
      {data.languages.length > 0 && (
        <PreviewSection title="Languages">
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

      {/* Footer */}
      <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>
        Resume prepared with Lion Jobs Agency · lionjobsagency.com
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export function ResumeBuilder() {
  const [data, setData] = useState<ResumeData>(INITIAL);
  const [showPreview, setShowPreview] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  function patch(patch: Partial<ResumeData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  // Work
  function addWork()   { patch({ work: [...data.work, newWork()] }); }
  function delWork(id: string) { patch({ work: data.work.filter((w) => w.id !== id) }); }
  function setWork(id: string, field: keyof Work, value: string | boolean) {
    patch({ work: data.work.map((w) => w.id === id ? { ...w, [field]: value } : w) });
  }

  // Education
  function addEdu()   { patch({ education: [...data.education, newEdu()] }); }
  function delEdu(id: string) { patch({ education: data.education.filter((e) => e.id !== id) }); }
  function setEdu(id: string, field: keyof Edu, value: string | boolean) {
    patch({ education: data.education.map((e) => e.id === id ? { ...e, [field]: value } : e) });
  }

  // Skills
  function addSkill() {
    const s = skillInput.trim();
    if (!s || data.skills.includes(s)) return;
    patch({ skills: [...data.skills, s] });
    setSkillInput('');
  }
  function delSkill(s: string) { patch({ skills: data.skills.filter((sk) => sk !== s) }); }

  // Languages
  function addLang()  { patch({ languages: [...data.languages, newLang()] }); }
  function delLang(id: string) { patch({ languages: data.languages.filter((l) => l.id !== id) }); }
  function setLang(id: string, field: keyof Lang, value: string) {
    patch({ languages: data.languages.map((l) => l.id === id ? { ...l, [field]: value } : l) });
  }

  function handlePrint() { window.print(); }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

      {/* ── Form Panel ── */}
      <div className={cn('flex-1 space-y-5 lg:max-w-[540px] no-print', showPreview && 'hidden lg:block')}>

        {/* Personal Info */}
        <SectionCard title="Personal Information" icon={User}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Full Name" required>
                <Input value={data.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Aung Ko Ko" />
              </Field>
            </div>
            <Field label="Phone Number">
              <Input value={data.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+959 77 000 0000" type="tel" />
            </Field>
            <Field label="Email Address">
              <Input value={data.email} onChange={(e) => patch({ email: e.target.value })} placeholder="you@example.com" type="email" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Location">
                <Input value={data.address} onChange={(e) => patch({ address: e.target.value })} placeholder="Yangon, Myanmar" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="LinkedIn URL">
                <Input value={data.linkedin} onChange={(e) => patch({ linkedin: e.target.value })} placeholder="linkedin.com/in/your-profile" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Professional Summary">
                <Textarea
                  value={data.objective}
                  onChange={(v) => patch({ objective: v })}
                  placeholder="e.g. Motivated software engineer with 3+ years of experience building web applications…"
                  rows={3}
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* Work Experience */}
        <SectionCard title="Work Experience" icon={Briefcase}>
          {data.work.map((w, i) => (
            <div key={w.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Position {i + 1}</span>
                <RemoveBtn onClick={() => delWork(w.id)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Job Title">
                  <Input value={w.position} onChange={(e) => setWork(w.id, 'position', e.target.value)} placeholder="e.g. Software Engineer" />
                </Field>
                <Field label="Company">
                  <Input value={w.company} onChange={(e) => setWork(w.id, 'company', e.target.value)} placeholder="e.g. ABC Co." />
                </Field>
                <Field label="Start Date">
                  <Input value={w.startDate} onChange={(e) => setWork(w.id, 'startDate', e.target.value)} placeholder="Jan 2022" />
                </Field>
                <div>
                  <Field label="End Date">
                    <Input value={w.endDate} onChange={(e) => setWork(w.id, 'endDate', e.target.value)} placeholder="Dec 2023" disabled={w.current} />
                  </Field>
                  <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={w.current}
                      onChange={(e) => setWork(w.id, 'current', e.target.checked)}
                      className="rounded border-border"
                    />
                    Currently working here
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Key Responsibilities">
                    <Textarea
                      value={w.description}
                      onChange={(v) => setWork(w.id, 'description', v)}
                      placeholder="e.g. Led development of e-commerce platform serving 50k+ users…"
                      rows={2}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
          <AddButton onClick={addWork} label="Add Work Experience" />
        </SectionCard>

        {/* Education */}
        <SectionCard title="Education" icon={GraduationCap}>
          {data.education.map((e, i) => (
            <div key={e.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Education {i + 1}</span>
                <RemoveBtn onClick={() => delEdu(e.id)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="School / University">
                    <Input value={e.school} onChange={(ev) => setEdu(e.id, 'school', ev.target.value)} placeholder="e.g. University of Yangon" />
                  </Field>
                </div>
                <Field label="Degree">
                  <Input value={e.degree} onChange={(ev) => setEdu(e.id, 'degree', ev.target.value)} placeholder="e.g. B.Sc." />
                </Field>
                <Field label="Field of Study">
                  <Input value={e.field} onChange={(ev) => setEdu(e.id, 'field', ev.target.value)} placeholder="e.g. Computer Science" />
                </Field>
                <Field label="Start Year">
                  <Input value={e.startDate} onChange={(ev) => setEdu(e.id, 'startDate', ev.target.value)} placeholder="2018" />
                </Field>
                <div>
                  <Field label="End Year">
                    <Input value={e.endDate} onChange={(ev) => setEdu(e.id, 'endDate', ev.target.value)} placeholder="2022" disabled={e.current} />
                  </Field>
                  <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={e.current}
                      onChange={(ev) => setEdu(e.id, 'current', ev.target.checked)}
                      className="rounded border-border"
                    />
                    Currently studying
                  </label>
                </div>
              </div>
            </div>
          ))}
          <AddButton onClick={addEdu} label="Add Education" />
        </SectionCard>

        {/* Skills */}
        <SectionCard title="Skills" icon={Wrench}>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="Type a skill and press Enter…"
            />
            <Button type="button" onClick={addSkill} variant="outline" size="sm" className="shrink-0 rounded-xl">
              <Plus size={14} />
            </Button>
          </div>
          {data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.skills.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-400"
                >
                  {s}
                  <button
                    onClick={() => delSkill(s)}
                    aria-label={`Remove ${s}`}
                    className="text-brand-400 transition-colors hover:text-brand-700 dark:hover:text-brand-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Languages */}
        <SectionCard title="Languages" icon={Globe}>
          {data.languages.map((l) => (
            <div key={l.id} className="flex items-center gap-3">
              <Input
                value={l.language}
                onChange={(e) => setLang(l.id, 'language', e.target.value)}
                placeholder="e.g. English"
                className="flex-1"
              />
              <SelectLevel value={l.level} onChange={(v) => setLang(l.id, 'level', v)} />
              <RemoveBtn onClick={() => delLang(l.id)} />
            </div>
          ))}
          <AddButton onClick={addLang} label="Add Language" />
        </SectionCard>
      </div>

      {/* ── Preview Panel ── */}
      <div className={cn('flex-1 lg:sticky lg:top-20 lg:self-start', !showPreview && 'hidden lg:block')}>
        {/* Action bar */}
        <div className="no-print mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">Resume Preview</p>
          <Button
            onClick={handlePrint}
            size="sm"
            className="gap-1.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/20"
          >
            <Printer size={14} /> Download PDF
          </Button>
        </div>

        {/* Preview container */}
        <div className="overflow-auto rounded-xl border border-border shadow-sm print:overflow-visible print:rounded-none print:border-none print:shadow-none">
          <ResumePreview data={data} />
        </div>
      </div>

      {/* Mobile toggle */}
      <div className="no-print fixed bottom-24 right-5 z-40 lg:hidden sm:right-6">
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg transition-colors hover:bg-accent"
        >
          {showPreview ? <><EyeOff size={15} /> Edit</>  : <><Eye size={15} /> Preview</>}
        </button>
      </div>
    </div>
  );
}
