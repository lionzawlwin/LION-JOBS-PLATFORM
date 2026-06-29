/**
 * ============================================================
 *  LION JOBS AGENCY — Free Enterprise CRM
 *  Google Apps Script Automation Suite
 *  crm_automation.gs
 *
 *  HOW TO INSTALL:
 *  1. Open your Google Sheet
 *  2. Extensions → Apps Script
 *  3. Delete any existing code
 *  4. Paste this entire file
 *  5. Click Save (Ctrl+S)
 *  6. Run installTriggers() once (click ▶ with installTriggers selected)
 *  7. Authorize when prompted
 *
 *  SCRIPT PROPERTIES (set before running):
 *  Extensions → Apps Script → Project Settings → Script Properties
 *  ┌─────────────────────────┬──────────────────────────────────────┐
 *  │ Key                     │ Value                                │
 *  ├─────────────────────────┼──────────────────────────────────────┤
 *  │ TELEGRAM_BOT_TOKEN      │ Your bot token from @BotFather       │
 *  │ TELEGRAM_CHAT_ID        │ Your personal chat ID (not channel)  │
 *  │ DIGEST_EMAIL            │ lionzawlwin@gmail.com                │
 *  └─────────────────────────┴──────────────────────────────────────┘
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────────
//  SHEET & COLUMN CONSTANTS
//  Match exactly with your Google Sheet tab names and column order.
// ─────────────────────────────────────────────────────────────────

const SHEET = {
  JOBS:         'Jobs',
  PIPELINE:     'Pipeline',
  DASHBOARD:    'Dashboard',
  COMPANIES:    'Companies',
  ANALYTICS:    'Analytics',
  ACTIVITY_LOG: 'Activity Log',
  CONFIG:       'Config',
};

// Jobs tab columns (1-based for getRange)
const JOB = {
  JOB_ID:             1,   // A
  TITLE:              2,   // B
  COMPANY:            3,   // C
  CATEGORY:           4,   // D
  TYPE:               5,   // E
  LOCATION:           6,   // F
  SALARY_MIN:         7,   // G
  SALARY_MAX:         8,   // H
  CURRENCY:           9,   // I
  DESCRIPTION:        10,  // J
  REQUIREMENTS:       11,  // K
  POSTED_AT:          12,  // L
  DEADLINE:           13,  // M
  IS_URGENT:          14,  // N
  IS_FEATURED:        15,  // O
  STATUS:             16,  // P
  SOURCE:             17,  // Q
  APPLICATIONS_COUNT: 18,  // R  (formula column — do not write)
  HIRED_COUNT:        19,  // S  (formula column — do not write)
  NOTES:              20,  // T
  // Extended columns added by this script:
  DAYS_LIVE:          21,  // U  (formula)
  CONVERSION_RATE:    22,  // V  (formula)
  DEADLINE_STATUS:    23,  // W  (formula)
};

// Pipeline tab columns (1-based for getRange)
const PIPE = {
  CANDIDATE_ID:       1,   // A
  FULL_NAME:          2,   // B
  EMAIL:              3,   // C
  PHONE:              4,   // D
  JOB_ID:             5,   // E
  JOB_TITLE:          6,   // F
  COMPANY:            7,   // G
  STAGE:              8,   // H  ← Kanban key — never move this
  APPLIED_AT:         9,   // I  ← Kanban key — never move this
  STAGE_UPDATED_AT:   10,  // J
  ASSIGNED_TO:        11,  // K
  INTERVIEW_DATE:     12,  // L
  INTERVIEW_LOCATION: 13,  // M
  SALARY_EXPECTED:    14,  // N
  SALARY_OFFERED:     15,  // O
  NOTICE_PERIOD:      16,  // P
  SOURCE:             17,  // Q
  RATING:             18,  // R
  CV_URL:             19,  // S
  OFFER_DATE:         20,  // T
  START_DATE:         21,  // U
  WEBHOOK_SENT:       22,  // V
  NOTES:              23,  // W
  LAST_UPDATED:       24,  // X
  // Extended columns added by this script:
  DAYS_IN_STAGE:      25,  // Y  (formula)
  TIME_TO_RESPONSE:   26,  // Z  (formula)
};

const VALID_STAGES = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired', 'Rejected', 'Withdrawn'];


// ─────────────────────────────────────────────────────────────────
//  1. SIMPLE TRIGGER — onEdit(e)
//  Fires automatically on every cell edit. No installation needed.
//  Handles: timestamps, auto-fill, stage alerts, audit log.
// ─────────────────────────────────────────────────────────────────

function onEdit(e) {
  if (!e || !e.range) return;

  const sheet    = e.range.getSheet();
  const name     = sheet.getName();
  const col      = e.range.getColumn();
  const row      = e.range.getRow();
  const newValue = e.value;
  const oldValue = e.oldValue;

  // Skip header row
  if (row < 2) return;

  try {

    // ── Pipeline tab logic ──────────────────────────────────────
    if (name === SHEET.PIPELINE) {

      const now = new Date().toISOString();

      // A) Stage changed → update stage_updated_at + last_updated + send Telegram
      if (col === PIPE.STAGE) {
        sheet.getRange(row, PIPE.STAGE_UPDATED_AT).setValue(now);
        sheet.getRange(row, PIPE.LAST_UPDATED).setValue(now);
        _sendStageChangeTelegram(sheet, row, oldValue, newValue);
      }

      // B) Any edit → update last_updated (except the timestamp columns themselves)
      if (col !== PIPE.LAST_UPDATED && col !== PIPE.STAGE_UPDATED_AT) {
        sheet.getRange(row, PIPE.LAST_UPDATED).setValue(now);
      }

      // C) job_id entered → auto-fill job_title + company from Jobs tab
      if (col === PIPE.JOB_ID && newValue) {
        _autoFillJobDetails(sheet, row, newValue);
      }
    }

    // ── Jobs tab logic ──────────────────────────────────────────
    if (name === SHEET.JOBS) {

      // Status changed to Expired/Filled → send notification
      if (col === JOB.STATUS && (newValue === 'Expired' || newValue === 'Filled')) {
        _sendJobClosedTelegram(sheet, row, newValue);
      }
    }

    // ── Audit log — runs for BOTH tabs ─────────────────────────
    if (name === SHEET.PIPELINE || name === SHEET.JOBS) {
      _writeAuditLog(name, row, e.range.getA1Notation(), oldValue, newValue);
    }

  } catch (err) {
    // Never let an error break the user's edit. Log silently.
    console.error('[onEdit] Error: ' + err.message);
  }
}


// ─────────────────────────────────────────────────────────────────
//  2. JOB EXPIRY AUTOMATION
//  Runs daily at 7 AM (installed by installTriggers).
//  Marks jobs as 'Expired' if their deadline has passed.
// ─────────────────────────────────────────────────────────────────

function checkExpiredJobs() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName(SHEET.JOBS);
  if (!sheet) { console.warn('Jobs sheet not found'); return; }

  const data    = sheet.getDataRange().getValues();
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const expired = [];

  for (let i = 1; i < data.length; i++) {
    const row      = i + 1;
    const jobId    = data[i][JOB.JOB_ID - 1];
    const title    = data[i][JOB.TITLE - 1];
    const company  = data[i][JOB.COMPANY - 1];
    const deadline = data[i][JOB.DEADLINE - 1];
    const status   = data[i][JOB.STATUS - 1];

    if (!jobId || !deadline || status !== 'Active') continue;

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate < today) {
      sheet.getRange(row, JOB.STATUS).setValue('Expired');
      expired.push({ title, company, deadline: _formatDate(deadlineDate) });
      _writeAuditLog(SHEET.JOBS, row, 'P' + row, 'Active', 'Expired');
    }
  }

  if (expired.length > 0) {
    // Send email summary
    const props = PropertiesService.getScriptProperties();
    const email = props.getProperty('DIGEST_EMAIL') || Session.getActiveUser().getEmail();

    const body = _buildExpiredJobsEmail(expired);
    GmailApp.sendEmail(email, `[Lion Jobs] ${expired.length} job(s) expired today`, body);

    // Send Telegram notification
    const msg = `⛔ *Job Expiry Alert*\n${expired.length} job(s) were automatically marked Expired:\n` +
      expired.map(j => `• ${j.title} @ ${j.company} (deadline: ${j.deadline})`).join('\n');
    _sendTelegram(msg);

    console.log(`Expired ${expired.length} jobs.`);
  } else {
    console.log('No expired jobs found today.');
  }
}


// ─────────────────────────────────────────────────────────────────
//  3. WEEKLY EMAIL DIGEST
//  Runs every Monday at 8 AM (installed by installTriggers).
//  Emails a full summary of pipeline health to the recruiter.
// ─────────────────────────────────────────────────────────────────

function sendWeeklyDigest() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const pipeline = ss.getSheetByName(SHEET.PIPELINE);
  const jobs     = ss.getSheetByName(SHEET.JOBS);
  if (!pipeline || !jobs) { console.warn('Required sheets missing'); return; }

  const pipeData = pipeline.getDataRange().getValues().slice(1);  // skip header
  const jobData  = jobs.getDataRange().getValues().slice(1);

  const now      = new Date();
  const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

  // ── Compute metrics ────────────────────────────────────────────
  const totalCandidates = pipeData.filter(r => r[PIPE.CANDIDATE_ID - 1]).length;
  const newThisWeek     = pipeData.filter(r => _parseDate(r[PIPE.APPLIED_AT - 1]) > weekAgo).length;
  const newThisMonth    = pipeData.filter(r => _parseDate(r[PIPE.APPLIED_AT - 1]) > monthAgo).length;

  const byStage = {};
  VALID_STAGES.forEach(s => {
    byStage[s] = pipeData.filter(r => r[PIPE.STAGE - 1] === s).length;
  });

  const activeJobs  = jobData.filter(r => r[JOB.STATUS - 1] === 'Active').length;
  const expiredJobs = jobData.filter(r => r[JOB.STATUS - 1] === 'Expired').length;
  const totalHired  = byStage['Hired'] || 0;
  const conversion  = totalCandidates > 0
    ? Math.round((totalHired / totalCandidates) * 100) : 0;

  // Cold candidates: in Applied stage > 7 days
  const cold = pipeData.filter(r =>
    r[PIPE.STAGE - 1] === 'Applied' &&
    _daysSince(_parseDate(r[PIPE.STAGE_UPDATED_AT - 1] || r[PIPE.APPLIED_AT - 1])) > 7
  );

  // Upcoming interviews this week
  const upcomingInterviews = pipeData.filter(r => {
    const d = _parseDate(r[PIPE.INTERVIEW_DATE - 1]);
    return d && d > now && d < new Date(now.getTime() + 7 * 86400000);
  });

  // Top performing jobs (by applications)
  const jobApps = {};
  pipeData.forEach(r => {
    const jt = r[PIPE.JOB_TITLE - 1];
    if (jt) jobApps[jt] = (jobApps[jt] || 0) + 1;
  });
  const topJobs = Object.entries(jobApps)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Build email ────────────────────────────────────────────────
  const subject = `[Lion Jobs] Weekly Digest — ${_formatDate(now)}`;
  const body = `
🦁 LION JOBS AGENCY — WEEKLY DIGEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Report Date: ${_formatDate(now)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 KEY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Active Jobs:            ${activeJobs}
  Total Candidates:       ${totalCandidates}
  New This Week:          ${newThisWeek}
  New This Month:         ${newThisMonth}
  Overall Conversion:     ${conversion}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 PIPELINE SNAPSHOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Applied:       ${byStage['Applied'] || 0}
  Shortlisted:   ${byStage['Shortlisted'] || 0}
  Interview:     ${byStage['Interview'] || 0}
  Offer:         ${byStage['Offer'] || 0}
  Hired:         ${byStage['Hired'] || 0}
  Rejected:      ${byStage['Rejected'] || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Cold Candidates (Applied > 7 days):  ${cold.length}
${cold.slice(0, 5).map(r => `    • ${r[PIPE.FULL_NAME-1]} — ${r[PIPE.JOB_TITLE-1]}`).join('\n')}
${cold.length > 5 ? `    ... and ${cold.length - 5} more` : ''}

  Upcoming Interviews This Week:  ${upcomingInterviews.length}
${upcomingInterviews.map(r =>
    `    • ${r[PIPE.FULL_NAME-1]} — ${r[PIPE.JOB_TITLE-1]} on ${_formatDate(_parseDate(r[PIPE.INTERVIEW_DATE-1]))}`
  ).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 TOP JOBS BY APPLICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${topJobs.map((j, i) => `  ${i+1}. ${j[0]} — ${j[1]} application${j[1]>1?'s':''}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Expired Jobs This Period:  ${expiredJobs}

Auto-generated by Lion Jobs CRM Automation
  `.trim();

  const props = PropertiesService.getScriptProperties();
  const email = props.getProperty('DIGEST_EMAIL') || Session.getActiveUser().getEmail();
  GmailApp.sendEmail(email, subject, body);

  console.log('Weekly digest sent to ' + email);
}


// ─────────────────────────────────────────────────────────────────
//  4. TELEGRAM ALERTS
//  Called from onEdit and checkExpiredJobs.
//  Direct bot API — no third-party service needed.
// ─────────────────────────────────────────────────────────────────

function _sendTelegram(text) {
  try {
    const props   = PropertiesService.getScriptProperties();
    const token   = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId  = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) {
      console.warn('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in Script Properties.');
      return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    UrlFetchApp.fetch(url, {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify({
        chat_id:    chatId,
        text:       text,
        parse_mode: 'Markdown',
      }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    // Never crash the calling function
    console.error('[Telegram] Send failed: ' + err.message);
  }
}

function _sendStageChangeTelegram(sheet, row, oldStage, newStage) {
  const stageEmoji = {
    Applied: '📥', Shortlisted: '⭐', Interview: '📅',
    Offer: '💼', Hired: '🎉', Rejected: '❌', Withdrawn: '↩️',
  };
  const name     = sheet.getRange(row, PIPE.FULL_NAME).getValue();
  const position = sheet.getRange(row, PIPE.JOB_TITLE).getValue();
  const company  = sheet.getRange(row, PIPE.COMPANY).getValue();
  const emoji    = stageEmoji[newStage] || '🔄';

  const msg = `${emoji} *Stage Update*\n` +
    `👤 ${name}\n` +
    `💼 ${position}${company ? ' @ ' + company : ''}\n` +
    `📊 ${oldStage || 'New'} → *${newStage}*`;
  _sendTelegram(msg);
}

function _sendJobClosedTelegram(sheet, row, status) {
  const title   = sheet.getRange(row, JOB.TITLE).getValue();
  const company = sheet.getRange(row, JOB.COMPANY).getValue();
  const emoji   = status === 'Filled' ? '✅' : '⛔';
  const msg = `${emoji} *Job ${status}*\n💼 ${title}\n🏢 ${company}`;
  _sendTelegram(msg);
}

/**
 * PUBLIC: Test your Telegram connection directly from the Apps Script editor.
 * Select this function and click ▶ to send a test message.
 */
function testTelegramConnection() {
  _sendTelegram('✅ *Lion Jobs CRM* — Telegram connection is working!');
  console.log('Test message sent. Check your Telegram.');
}


// ─────────────────────────────────────────────────────────────────
//  5. AUDIT LOG
//  Writes every tracked change to the 'Activity Log' tab.
//  Creates the tab automatically if it doesn't exist.
// ─────────────────────────────────────────────────────────────────

function _writeAuditLog(sheetName, row, cell, oldValue, newValue) {
  try {
    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    let log   = ss.getSheetByName(SHEET.ACTIVITY_LOG);

    // Auto-create the Activity Log tab if missing
    if (!log) {
      log = ss.insertSheet(SHEET.ACTIVITY_LOG);
      const headers = ['Timestamp', 'User', 'Sheet', 'Cell', 'Old Value', 'New Value', 'Row Note'];
      log.getRange(1, 1, 1, headers.length).setValues([headers])
        .setBackground('#1e3a5f').setFontColor('#ffffff').setFontWeight('bold');
      log.setFrozenRows(1);
      log.setColumnWidth(1, 160); // Timestamp
      log.setColumnWidth(4, 80);  // Cell
      log.setColumnWidth(5, 200); // Old Value
      log.setColumnWidth(6, 200); // New Value
    }

    log.appendRow([
      new Date(),
      Session.getActiveUser().getEmail() || 'Script',
      sheetName,
      cell,
      oldValue !== undefined ? String(oldValue) : '',
      newValue !== undefined ? String(newValue) : '',
      `${sheetName} row ${row}`,
    ]);
  } catch (err) {
    console.error('[AuditLog] ' + err.message);
  }
}


// ─────────────────────────────────────────────────────────────────
//  6. AUTO-FILL HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * When a recruiter enters a job_id in the Pipeline tab,
 * automatically fills in job_title (col F) and company (col G).
 */
function _autoFillJobDetails(pipelineSheet, row, jobId) {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const jobsSheet = ss.getSheetByName(SHEET.JOBS);
    if (!jobsSheet) return;

    const data = jobsSheet.getDataRange().getValues();
    const job  = data.find(r => r[JOB.JOB_ID - 1] === jobId);
    if (!job) return;

    pipelineSheet.getRange(row, PIPE.JOB_TITLE).setValue(job[JOB.TITLE - 1]);
    pipelineSheet.getRange(row, PIPE.COMPANY).setValue(job[JOB.COMPANY - 1]);
  } catch (err) {
    console.error('[AutoFill] ' + err.message);
  }
}


// ─────────────────────────────────────────────────────────────────
//  7. DASHBOARD AUTO-REFRESH
//  Updates named cells on the Dashboard tab with live KPIs.
//  Runs every hour (installed by installTriggers).
//  This supplements the QUERY formulas — useful for sparklines
//  that can't use QUERY directly.
// ─────────────────────────────────────────────────────────────────

function refreshDashboard() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const dash     = ss.getSheetByName(SHEET.DASHBOARD);
  const pipeline = ss.getSheetByName(SHEET.PIPELINE);
  const jobs     = ss.getSheetByName(SHEET.JOBS);
  if (!dash || !pipeline || !jobs) return;

  const pipeData = pipeline.getDataRange().getValues().slice(1);
  const jobData  = jobs.getDataRange().getValues().slice(1);
  const now      = new Date();

  // KPI values — written to a "KPI_DATA" hidden area (row 200+)
  // Your QUERY formulas on the visible Dashboard can reference these cells.
  const activeJobs     = jobData.filter(r => r[JOB.STATUS - 1] === 'Active').length;
  const totalCandidates = pipeData.filter(r => r[PIPE.CANDIDATE_ID - 1]).length;
  const appliedToday   = pipeData.filter(r => {
    const d = _parseDate(r[PIPE.APPLIED_AT - 1]);
    return d && _isSameDay(d, now);
  }).length;
  const hired = pipeData.filter(r => r[PIPE.STAGE - 1] === 'Hired').length;
  const interviews = pipeData.filter(r => r[PIPE.STAGE - 1] === 'Interview').length;

  // 30-day application trend (one count per day, newest → oldest)
  const trend = [];
  for (let d = 0; d < 30; d++) {
    const day = new Date(now); day.setDate(day.getDate() - d); day.setHours(0,0,0,0);
    const next = new Date(day); next.setDate(next.getDate() + 1);
    trend.push(pipeData.filter(r => {
      const ad = _parseDate(r[PIPE.APPLIED_AT - 1]);
      return ad && ad >= day && ad < next;
    }).length);
  }

  // Write KPI block to Dashboard!A200 (hidden reference area)
  const kpiBlock = [
    ['Last Refreshed', now.toISOString()],
    ['Active Jobs',    activeJobs],
    ['Total Candidates', totalCandidates],
    ['Applied Today',  appliedToday],
    ['Hired Total',    hired],
    ['Interviews',     interviews],
    ['Conversion %',   totalCandidates > 0 ? Math.round(hired/totalCandidates*100) + '%' : '0%'],
  ];
  dash.getRange(200, 1, kpiBlock.length, 2).setValues(kpiBlock);

  // Write 30-day trend to Dashboard!D200:D229 for SPARKLINE
  dash.getRange(200, 4, trend.length, 1).setValues(trend.map(v => [v]));

  console.log('Dashboard refreshed at ' + now.toLocaleString());
}


// ─────────────────────────────────────────────────────────────────
//  8. SHEET SETUP — Creates all required tabs with correct headers
//  Run setupAllSheets() once after installing to scaffold everything.
// ─────────────────────────────────────────────────────────────────

function setupAllSheets() {
  _setupActivityLog();
  _setupDashboard();
  _setupCompanies();
  _setupConfig();
  _setupAnalytics();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'All CRM tabs created! Check Activity Log, Dashboard, Companies, Analytics, and Config.',
    '✅ Lion Jobs CRM Setup Complete', 10
  );
}

function _setupActivityLog() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SHEET.ACTIVITY_LOG)) return;
  const s   = ss.insertSheet(SHEET.ACTIVITY_LOG);
  const h   = ['Timestamp', 'User', 'Sheet', 'Cell', 'Old Value', 'New Value', 'Row Note'];
  s.getRange(1, 1, 1, h.length).setValues([h])
   .setBackground('#1e3a5f').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  s.setFrozenRows(1);
  s.setColumnWidths(1, h.length, 160);
  s.setColumnWidth(3, 100);
  s.setColumnWidth(4, 80);
}

function _setupDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SHEET.DASHBOARD)) {
    console.log('Dashboard sheet already exists — skipping.');
    return;
  }
  const s = ss.insertSheet(SHEET.DASHBOARD);
  s.setTabColor('#2563EB');

  // Title
  s.getRange('A1').setValue('🦁 LION JOBS — LIVE DASHBOARD')
   .setFontSize(18).setFontWeight('bold').setFontColor('#1e3a5f');
  s.getRange('A2').setValue('Auto-updates every hour • Last refresh: see A201')
   .setFontSize(9).setFontColor('#6b7280');

  // KPI headers row 4
  const kpiLabels = ['Active Jobs','Total Candidates','Applied Today','Hired Total','Interviews','Conversion %'];
  s.getRange(4, 1, 1, kpiLabels.length).setValues([kpiLabels])
   .setBackground('#2563EB').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11)
   .setHorizontalAlignment('center');

  // KPI values row 5 — reference the hidden KPI block written by refreshDashboard()
  const kpiFormulas = [
    '=B201', '=B202', '=B203', '=B204', '=B205', '=B206',
  ];
  s.getRange(5, 1, 1, kpiFormulas.length).setFormulas([kpiFormulas])
   .setFontSize(22).setFontWeight('bold').setFontColor('#1e3a5f')
   .setHorizontalAlignment('center').setBackground('#EFF6FF');
  s.setRowHeight(5, 55);

  // Divider
  s.getRange('A7').setValue('PIPELINE FUNNEL').setFontWeight('bold').setFontColor('#2563EB');

  // Funnel labels + formulas
  const stages = ['Applied','Shortlisted','Interview','Offer','Hired','Rejected'];
  stages.forEach((stage, i) => {
    const r = 8 + i;
    s.getRange(r, 1).setValue(stage).setFontWeight('bold');
    s.getRange(r, 2).setFormula(`=COUNTIF(Pipeline!H:H,"${stage}")`).setFontWeight('bold');
    s.getRange(r, 3).setFormula(
      `=IFERROR(SPARKLINE(B${r},{"charttype","bar";"max",COUNTIF(Pipeline!H:H,"Applied");"color1","#2563EB"}),"")`
    );
    s.setColumnWidth(3, 220);
  });

  // Section headers for QUERY areas
  s.getRange('E7').setValue('TOP CATEGORIES (Active Jobs)').setFontWeight('bold').setFontColor('#2563EB');
  s.getRange('E8').setFormula(
    '=IFERROR(QUERY(Jobs!D:P,"SELECT D, COUNT(D) WHERE P=\'Active\' GROUP BY D ORDER BY COUNT(D) DESC LABEL D \'Category\', COUNT(D) \'Jobs\'",0),"")'
  );

  s.getRange('H7').setValue('TOP COMPANIES (by Applications)').setFontWeight('bold').setFontColor('#2563EB');
  s.getRange('H8').setFormula(
    '=IFERROR(QUERY(Pipeline!G:G,"SELECT G, COUNT(G) WHERE G<>\'\' GROUP BY G ORDER BY COUNT(G) DESC LIMIT 10 LABEL G \'Company\', COUNT(G) \'Applications\'",0),"")'
  );

  s.getRange('A16').setValue('RECENT APPLICATIONS (last 15)').setFontWeight('bold').setFontColor('#2563EB');
  s.getRange('A17').setFormula(
    '=IFERROR(QUERY(Pipeline!B:I,"SELECT B,F,G,H,I WHERE B<>\'\' ORDER BY I DESC LIMIT 15 LABEL B \'Name\',F \'Position\',G \'Company\',H \'Stage\',I \'Applied At\'",0),"")'
  );

  s.getRange('A35').setValue('⚠️ COLD CANDIDATES (Applied > 7 days without update)').setFontWeight('bold').setFontColor('#DC2626');
  s.getRange('A36').setFormula(
    '=IFERROR(QUERY(Pipeline!B:J,"SELECT B,F,G,H,I,J WHERE H=\'Applied\' ORDER BY I ASC LIMIT 20 LABEL B \'Name\',F \'Position\',G \'Company\',H \'Stage\',I \'Applied At\',J \'Stage Updated\'",0),"")'
  );

  s.getRange('A52').setValue('📅 UPCOMING INTERVIEWS').setFontWeight('bold').setFontColor('#D97706');
  s.getRange('A53').setFormula(
    '=IFERROR(QUERY(Pipeline!B:L,"SELECT B,F,G,H,L WHERE H=\'Interview\' AND L>\'\' ORDER BY L ASC LIMIT 15 LABEL B \'Name\',F \'Position\',G \'Company\',H \'Stage\',L \'Interview Date\'",0),"")'
  );

  // 30-day sparkline title
  s.getRange('A68').setValue('30-DAY APPLICATION TREND').setFontWeight('bold').setFontColor('#2563EB');
  s.getRange('A69').setFormula(
    '=IFERROR(SPARKLINE(Dashboard!D200:D229,{"charttype","line";"color","#2563EB";"linewidth",2}),"")'
  );
  s.setRowHeight(69, 80);
  s.setColumnWidth(1, 400);

  // Hidden KPI reference area label
  s.getRange('A199').setValue('[CRM Auto-Data — Do Not Edit Below]')
   .setFontColor('#9ca3af').setFontSize(8);

  s.setFrozenRows(3);
  console.log('Dashboard tab created.');
}

function _setupCompanies() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SHEET.COMPANIES)) return;
  const s  = ss.insertSheet(SHEET.COMPANIES);
  s.setTabColor('#10B981');

  const headers = [
    'company_id','name','industry','size','website',
    'contact_name','contact_email','partnership_level',
    'active_jobs','total_applications','total_hires','hire_rate','notes'
  ];
  s.getRange(1, 1, 1, headers.length).setValues([headers])
   .setBackground('#10B981').setFontColor('#ffffff').setFontWeight('bold');
  s.setFrozenRows(1);

  // Example row
  s.getRange(2, 1, 1, headers.length).setValues([[
    'co-001','KBZ Bank','Finance','Large','kbzbank.com',
    '','','Gold','','','','',''
  ]]);

  // Auto-count formulas for row 2 — extend down manually as you add companies
  s.getRange('I2').setFormula("=IFERROR(COUNTIFS(Jobs!C:C,B2,Jobs!P:P,\"Active\"),0)");
  s.getRange('J2').setFormula("=IFERROR(COUNTIF(Pipeline!G:G,B2),0)");
  s.getRange('K2').setFormula("=IFERROR(COUNTIFS(Pipeline!G:G,B2,Pipeline!H:H,\"Hired\"),0)");
  s.getRange('L2').setFormula("=IFERROR(IF(J2>0,TEXT(K2/J2,\"0%\"),\"—\"),\"—\")");

  s.setColumnWidth(2, 180);
  s.setColumnWidth(5, 160);
  console.log('Companies tab created.');
}

function _setupConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SHEET.CONFIG)) return;
  const s  = ss.insertSheet(SHEET.CONFIG);
  s.setTabColor('#6B7280');

  const configs = [
    ['Categories',    'Job Types',   'Stages',      'Sources',    'Partnership Levels', 'Job Status'],
    ['Engineering',   'Full-time',   'Applied',     'Website',    'Bronze',             'Active'],
    ['Design',        'Part-time',   'Shortlisted', 'Referral',   'Silver',             'Draft'],
    ['Marketing',     'Contract',    'Interview',   'LinkedIn',   'Gold',               'Filled'],
    ['Sales',         'Remote',      'Offer',       'Facebook',   'Exclusive',          'Expired'],
    ['Finance',       'Internship',  'Hired',       'Telegram',   '',                   'Closed'],
    ['Operations',    '',            'Rejected',    'Walk-in',    '',                   ''],
    ['Healthcare',    '',            'Withdrawn',   'Agency',     '',                   ''],
    ['Education',     '',            '',            'Job Board',  '',                   ''],
    ['Customer Svc',  '',            '',            'Other',      '',                   ''],
    ['Other',         '',            '',            '',           '',                   ''],
  ];

  s.getRange(1, 1, configs.length, configs[0].length).setValues(configs);
  s.getRange(1, 1, 1, configs[0].length)
   .setBackground('#374151').setFontColor('#ffffff').setFontWeight('bold');
  s.setFrozenRows(1);

  // Protect the config tab
  const protection = s.protect().setDescription('Config — dropdown source lists');
  protection.setWarningOnly(true);

  console.log('Config tab created.');
}

function _setupAnalytics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SHEET.ANALYTICS)) return;
  const s  = ss.insertSheet(SHEET.ANALYTICS);
  s.setTabColor('#7C3AED');

  s.getRange('A1').setValue('📈 ANALYTICS').setFontSize(16).setFontWeight('bold').setFontColor('#1e3a5f');

  // Applications by category
  s.getRange('A3').setValue('APPLICATIONS BY JOB CATEGORY').setFontWeight('bold').setFontColor('#7C3AED');
  s.getRange('A4').setFormula(
    '=IFERROR(QUERY(Pipeline!F:H,"SELECT F, COUNT(A), COUNTIF(H,\'Hired\') GROUP BY F ORDER BY COUNT(A) DESC LABEL F \'Position\',COUNT(A) \'Total Applications\',COUNTIF(H,\'Hired\') \'Hired\'",0),"")'
  );

  // Stage conversion rates
  s.getRange('D3').setValue('STAGE CONVERSION RATES').setFontWeight('bold').setFontColor('#7C3AED');
  const stagesConv = ['Applied','Shortlisted','Interview','Offer','Hired'];
  s.getRange('D4').setValue('Stage'); s.getRange('E4').setValue('Count'); s.getRange('F4').setValue('% of Total');
  stagesConv.forEach((st, i) => {
    const r = 5 + i;
    s.getRange(r, 4).setValue(st);
    s.getRange(r, 5).setFormula(`=COUNTIF(Pipeline!H:H,"${st}")`);
    s.getRange(r, 6).setFormula(`=IFERROR(TEXT(E${r}/COUNTA(Pipeline!A2:A),"0.0%"),"")`);
  });

  // Source breakdown
  s.getRange('A18').setValue('CANDIDATE SOURCES').setFontWeight('bold').setFontColor('#7C3AED');
  s.getRange('A19').setFormula(
    '=IFERROR(QUERY(Pipeline!Q:Q,"SELECT Q, COUNT(Q) WHERE Q<>\'\' GROUP BY Q ORDER BY COUNT(Q) DESC LABEL Q \'Source\', COUNT(Q) \'Applications\'",0),"")'
  );

  // Average days to hire
  s.getRange('D18').setValue('SALARY ANALYSIS (Active Jobs)').setFontWeight('bold').setFontColor('#7C3AED');
  s.getRange('D19').setFormula(
    '=IFERROR(QUERY(Jobs!D:H,"SELECT D, AVG(G), AVG(H) WHERE P=\'Active\' GROUP BY D ORDER BY AVG(H) DESC LABEL D \'Category\',AVG(G) \'Avg Min Salary\',AVG(H) \'Avg Max Salary\'",0),"")'
  );

  // Monthly application trend
  s.getRange('A32').setValue('MONTHLY APPLICATION VOLUME').setFontWeight('bold').setFontColor('#7C3AED');
  s.getRange('A33').setFormula(
    '=IFERROR(QUERY(Pipeline!A:I,"SELECT YEAR(I), MONTH(I), COUNT(A) WHERE A<>\'\' GROUP BY YEAR(I), MONTH(I) ORDER BY YEAR(I) DESC, MONTH(I) DESC LABEL YEAR(I) \'Year\', MONTH(I) \'Month\', COUNT(A) \'Applications\'",0),"")'
  );

  console.log('Analytics tab created.');
}


// ─────────────────────────────────────────────────────────────────
//  9. FORMULA INSTALLER
//  Adds the formula columns (U/V/W on Jobs, Y/Z on Pipeline)
//  that auto-calculate derived metrics.
//  Run once after your data is in place.
// ─────────────────────────────────────────────────────────────────

function installFormulaColumns() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const jobs = ss.getSheetByName(SHEET.JOBS);
  const pipe = ss.getSheetByName(SHEET.PIPELINE);

  // ── Jobs: headers ──
  jobs.getRange('U1').setValue('days_live').setFontWeight('bold').setBackground('#DBEAFE');
  jobs.getRange('V1').setValue('conversion_rate').setFontWeight('bold').setBackground('#DBEAFE');
  jobs.getRange('W1').setValue('deadline_status').setFontWeight('bold').setBackground('#DBEAFE');

  // ── Jobs: formulas from row 2 down (1000 rows) ──
  const jobRows = jobs.getLastRow() - 1;
  if (jobRows > 0) {
    const uFormulas = [], vFormulas = [], wFormulas = [];
    for (let r = 2; r <= jobRows + 1; r++) {
      uFormulas.push([`=IF(P${r}="Active",TODAY()-DATEVALUE(TEXT(L${r},"YYYY-MM-DD")),"—")`]);
      vFormulas.push([`=IF(R${r}>0,TEXT(S${r}/R${r},"0%"),"—")`]);
      wFormulas.push([`=IF(M${r}="","No deadline",IF(DATEVALUE(TEXT(M${r},"YYYY-MM-DD"))<TODAY(),"⛔ Expired",IF(DATEVALUE(TEXT(M${r},"YYYY-MM-DD"))-TODAY()<=3,"⚠️ Closes soon","✅ Open")))`]);
    }
    jobs.getRange(2, 21, jobRows, 1).setFormulas(uFormulas);
    jobs.getRange(2, 22, jobRows, 1).setFormulas(vFormulas);
    jobs.getRange(2, 23, jobRows, 1).setFormulas(wFormulas);
  }

  // ── Pipeline: headers ──
  pipe.getRange('Y1').setValue('days_in_stage').setFontWeight('bold').setBackground('#DBEAFE');
  pipe.getRange('Z1').setValue('time_to_response_days').setFontWeight('bold').setBackground('#DBEAFE');

  // ── Pipeline: formulas ──
  const pipeRows = pipe.getLastRow() - 1;
  if (pipeRows > 0) {
    const yFormulas = [], zFormulas = [];
    for (let r = 2; r <= pipeRows + 1; r++) {
      // days in current stage: since stage_updated_at, or since applied_at if no update yet
      yFormulas.push([`=IF(J${r}<>"",TODAY()-DATEVALUE(TEXT(J${r},"YYYY-MM-DD")),TODAY()-DATEVALUE(TEXT(I${r},"YYYY-MM-DD")))`]);
      // time to first response: days from applied_at to stage_updated_at
      zFormulas.push([`=IF(AND(J${r}<>"",I${r}<>""),DATEVALUE(TEXT(J${r},"YYYY-MM-DD"))-DATEVALUE(TEXT(I${r},"YYYY-MM-DD")),"Pending")`]);
    }
    pipe.getRange(2, 25, pipeRows, 1).setFormulas(yFormulas);
    pipe.getRange(2, 26, pipeRows, 1).setFormulas(zFormulas);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Formula columns installed on Jobs (U-W) and Pipeline (Y-Z).',
    '✅ Formulas Installed', 5
  );
  console.log('Formula columns installed.');
}


// ─────────────────────────────────────────────────────────────────
//  10. CONDITIONAL FORMATTING INSTALLER
//  Applies all color rules to Jobs and Pipeline tabs.
//  Run once: select applyConditionalFormatting() and click ▶
// ─────────────────────────────────────────────────────────────────

function applyConditionalFormatting() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const jobs = ss.getSheetByName(SHEET.JOBS);
  const pipe = ss.getSheetByName(SHEET.PIPELINE);
  const rules = [];

  // ── Jobs tab ────────────────────────────────────────────────────
  const jobsRange = jobs.getRange('A2:W1000');

  // Active jobs → soft green row
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$P2="Active"')
    .setBackground('#DCFCE7').setRanges([jobsRange]).build());

  // Draft → soft yellow
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$P2="Draft"')
    .setBackground('#FEF9C3').setRanges([jobsRange]).build());

  // Expired / Closed → soft red
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=OR($P2="Expired",$P2="Closed")')
    .setBackground('#FEE2E2').setRanges([jobsRange]).build());

  // Urgent = TRUE → gold background on Urgency column only
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$N2="TRUE"')
    .setBackground('#FEF3C7').setBold(true)
    .setRanges([jobs.getRange('B2:B1000')]).build());

  // Deadline approaching within 3 days → orange warning on col W
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('⚠️ Closes soon')
    .setBackground('#FFEDD5').setBold(true)
    .setRanges([jobs.getRange('W2:W1000')]).build());

  jobs.setConditionalFormatRules(rules);

  // ── Pipeline tab ────────────────────────────────────────────────
  const pipeRules = [];
  const pipeRange = pipe.getRange('A2:Z1000');

  // Stage colors on the stage column (H)
  const stageColors = [
    ['Applied',     '#DBEAFE', '#1D4ED8'],
    ['Shortlisted', '#FEF9C3', '#92400E'],
    ['Interview',   '#FFEDD5', '#C2410C'],
    ['Offer',       '#EDE9FE', '#5B21B6'],
    ['Hired',       '#DCFCE7', '#166534'],
    ['Rejected',    '#F3F4F6', '#6B7280'],
    ['Withdrawn',   '#F3F4F6', '#9CA3AF'],
  ];
  const stageCol = pipe.getRange('H2:H1000');
  stageColors.forEach(([stage, bg, fg]) => {
    pipeRules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(stage)
      .setBackground(bg).setFontColor(fg).setBold(true)
      .setRanges([stageCol]).build());
  });

  // Cold candidates: days_in_stage > 7 → red row background
  pipeRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($Y2>7,$H2<>"Hired",$H2<>"Rejected",$H2<>"Withdrawn")')
    .setBackground('#FEE2E2')
    .setRanges([pipeRange]).build());

  // Star candidates: rating = 5 → gold background
  pipeRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$R2=5')
    .setBackground('#FEF3C7')
    .setRanges([pipeRange]).build());

  pipe.setConditionalFormatRules(pipeRules);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Conditional formatting applied to Jobs and Pipeline tabs.',
    '✅ Formatting Applied', 5
  );
  console.log('Conditional formatting applied.');
}


// ─────────────────────────────────────────────────────────────────
//  11. DATA VALIDATION INSTALLER
//  Applies dropdown lists to key columns using Config tab as source.
// ─────────────────────────────────────────────────────────────────

function applyDataValidation() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const jobs = ss.getSheetByName(SHEET.JOBS);
  const pipe = ss.getSheetByName(SHEET.PIPELINE);

  // Helper: list validation from range
  const fromRange = (sheet, range) =>
    SpreadsheetApp.newDataValidation()
      .requireValueInRange(ss.getSheetByName(SHEET.CONFIG).getRange(range), true)
      .setAllowInvalid(false).build();

  // Helper: list validation from explicit values
  const fromList = (...values) =>
    SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false).build();

  // ── Jobs tab ────────────────────────────────────────────────────
  jobs.getRange('D2:D1000').setDataValidation(fromRange(jobs, 'A2:A11'));   // Category
  jobs.getRange('E2:E1000').setDataValidation(fromRange(jobs, 'B2:B6'));    // Type
  jobs.getRange('I2:I1000').setDataValidation(fromList('MMK','USD','SGD','EUR')); // Currency
  jobs.getRange('N2:N1000').setDataValidation(fromList('TRUE','FALSE'));   // is_urgent
  jobs.getRange('O2:O1000').setDataValidation(fromList('TRUE','FALSE'));   // is_featured
  jobs.getRange('P2:P1000').setDataValidation(fromRange(jobs, 'F2:F7'));   // Status

  // ── Pipeline tab ─────────────────────────────────────────────────
  pipe.getRange('H2:H1000').setDataValidation(fromRange(pipe, 'C2:C8'));   // Stage
  pipe.getRange('Q2:Q1000').setDataValidation(fromRange(pipe, 'D2:D9'));   // Source
  pipe.getRange('R2:R1000').setDataValidation(fromList('1','2','3','4','5')); // Rating 1-5

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Data validation dropdowns applied to Jobs and Pipeline.',
    '✅ Validation Applied', 5
  );
  console.log('Data validation applied.');
}


// ─────────────────────────────────────────────────────────────────
//  12. MASTER SETUP — Run this ONE TIME after pasting the script
// ─────────────────────────────────────────────────────────────────

/**
 * STEP 1: Run this function first.
 * It creates all tabs, formulas, formatting, and validation.
 */
function fullSetup() {
  setupAllSheets();
  Utilities.sleep(1000);
  installFormulaColumns();
  Utilities.sleep(500);
  applyConditionalFormatting();
  Utilities.sleep(500);
  applyDataValidation();
  refreshDashboard();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Full CRM setup complete. Now run installTriggers() to activate automation.',
    '🦁 Lion Jobs CRM Ready', 15
  );
}

/**
 * STEP 2: Run installTriggers() after fullSetup().
 * Installs all time-driven triggers (requires authorization).
 * Safe to re-run — deletes duplicates before installing.
 */
function installTriggers() {
  // Remove existing project triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Daily job expiry check — 7:00 AM every day
  ScriptApp.newTrigger('checkExpiredJobs')
    .timeBased().everyDays(1).atHour(7).create();

  // Weekly digest email — Monday at 8:00 AM
  ScriptApp.newTrigger('sendWeeklyDigest')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  // Dashboard refresh — every hour
  ScriptApp.newTrigger('refreshDashboard')
    .timeBased().everyHours(1).create();

  console.log('✅ Triggers installed:');
  console.log('  • checkExpiredJobs   — daily at 7 AM');
  console.log('  • sendWeeklyDigest   — Monday at 8 AM');
  console.log('  • refreshDashboard   — every hour');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '3 triggers installed. The CRM is now fully automated.',
    '✅ Triggers Active', 8
  );
}


// ─────────────────────────────────────────────────────────────────
//  PRIVATE UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────

function _parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function _formatDate(d) {
  if (!d) return '';
  return Utilities.formatDate(d instanceof Date ? d : new Date(d),
    Session.getScriptTimeZone(), 'dd MMM yyyy');
}

function _isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function _daysSince(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function _buildExpiredJobsEmail(expired) {
  return `Hi Lion Jobs Team,\n\nThe following job(s) were automatically marked as Expired today:\n\n` +
    expired.map((j, i) => `${i+1}. ${j.title} @ ${j.company} (deadline: ${j.deadline})`).join('\n') +
    `\n\nPlease review and repost any roles that are still needed.\n\n— Lion Jobs CRM Automation`;
}
