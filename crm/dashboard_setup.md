# Lion Jobs Agency — Dashboard & Registry Setup Guide
## Copy-Paste Ready Formulas for Google Sheets

---

## INSTALLATION ORDER

```
1. Paste crm_automation.gs into Apps Script editor
2. Run fullSetup()       ← creates all tabs + formulas + formatting
3. Run installTriggers() ← activates daily/weekly/hourly automations
4. Set Script Properties ← add TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DIGEST_EMAIL
5. Run testTelegramConnection() to verify Telegram works
```

---

## TAB REFERENCE

| Tab Name      | Purpose                          | Color Code |
|---------------|----------------------------------|------------|
| Jobs          | Job listings (existing)          | Default    |
| Pipeline      | Candidate pipeline (existing)    | Default    |
| Dashboard     | Live KPI command center          | Blue       |
| Companies     | Partner company registry         | Green      |
| Analytics     | Deep-dive QUERY views            | Purple     |
| Activity Log  | Audit trail (auto-filled)        | Default    |
| Config        | Dropdown source lists            | Gray       |

> All tabs except Jobs and Pipeline are **created automatically** by `fullSetup()`.

---

## SECTION 1 — DASHBOARD TAB FORMULAS

The Dashboard tab is scaffolded by the script. Below are all formulas
in copy-paste format if you need to rebuild or adjust any cell manually.

### 1A — KPI Row (Row 5, Columns A–F)

Paste each formula into the corresponding cell:

| Cell | Metric | Formula |
|------|--------|---------|
| A5 | Active Jobs | `=COUNTIF(Jobs!P:P,"Active")` |
| B5 | Total Candidates | `=COUNTA(Pipeline!A2:A)` |
| C5 | Applied Today | `=COUNTIFS(Pipeline!I:I,">="&TODAY(),Pipeline!I:I,"<"&(TODAY()+1))` |
| D5 | Hired Total | `=COUNTIF(Pipeline!H:H,"Hired")` |
| E5 | Interviews Active | `=COUNTIF(Pipeline!H:H,"Interview")` |
| F5 | Conversion % | `=TEXT(IFERROR(D5/B5,0),"0.0%")` |

### 1B — Pipeline Funnel (Rows 8–14)

Paste in Column B (counts) starting at B8:

```
=COUNTIF(Pipeline!H:H,"Applied")
=COUNTIF(Pipeline!H:H,"Shortlisted")
=COUNTIF(Pipeline!H:H,"Interview")
=COUNTIF(Pipeline!H:H,"Offer")
=COUNTIF(Pipeline!H:H,"Hired")
=COUNTIF(Pipeline!H:H,"Rejected")
=COUNTIF(Pipeline!H:H,"Withdrawn")
```

Paste in Column C (SPARKLINE bars) starting at C8:

```
=IFERROR(SPARKLINE(B8,{"charttype","bar";"max",B8+B9+B10+B11+B12+B13+B14;"color1","#2563EB"}),"")
=IFERROR(SPARKLINE(B9,{"charttype","bar";"max",B8+B9+B10+B11+B12+B13+B14;"color1","#F59E0B"}),"")
=IFERROR(SPARKLINE(B10,{"charttype","bar";"max",B8+B9+B10+B11+B12+B13+B14;"color1","#F97316"}),"")
=IFERROR(SPARKLINE(B11,{"charttype","bar";"max",B8+B9+B10+B11+B12+B13+B14;"color1","#8B5CF6"}),"")
=IFERROR(SPARKLINE(B12,{"charttype","bar";"max",B8+B9+B10+B11+B12+B13+B14;"color1","#10B981"}),"")
=IFERROR(SPARKLINE(B13,{"charttype","bar";"max",B8+B9+B10+B11+B12+B13+B14;"color1","#6B7280"}),"")
=IFERROR(SPARKLINE(B14,{"charttype","bar";"max",B8+B9+B10+B11+B12+B13+B14;"color1","#9CA3AF"}),"")
```

### 1C — Top Job Categories (Cell E8)

```
=IFERROR(
  QUERY(Jobs!D:P,
    "SELECT D, COUNT(D)
     WHERE P='Active'
     GROUP BY D
     ORDER BY COUNT(D) DESC
     LABEL D 'Category', COUNT(D) 'Live Jobs'",
  0),
"No data")
```

### 1D — Top Companies by Applications (Cell H8)

```
=IFERROR(
  QUERY(Pipeline!G:G,
    "SELECT G, COUNT(G)
     WHERE G<>''
     GROUP BY G
     ORDER BY COUNT(G) DESC
     LIMIT 10
     LABEL G 'Company', COUNT(G) 'Applications'",
  0),
"No data")
```

### 1E — Recent 15 Applications (Cell A17)

```
=IFERROR(
  QUERY(Pipeline!B:I,
    "SELECT B, F, G, H, I
     WHERE B<>''
     ORDER BY I DESC
     LIMIT 15
     LABEL B 'Candidate', F 'Applied For', G 'Company', H 'Stage', I 'Applied At'",
  0),
"No applications yet")
```

### 1F — Cold Candidates Alert (Cell A36)
> These are people who applied more than 7 days ago and haven't been moved.

```
=IFERROR(
  QUERY(Pipeline!B:J,
    "SELECT B, F, G, H, I, J
     WHERE H='Applied'
     ORDER BY I ASC
     LIMIT 20
     LABEL B 'Name', F 'Position', G 'Company', H 'Stage', I 'Applied At', J 'Stage Updated'",
  0),
"No cold candidates — great job!")
```

### 1G — Upcoming Interviews (Cell A53)

```
=IFERROR(
  QUERY(Pipeline!B:L,
    "SELECT B, F, G, H, L
     WHERE H='Interview' AND L>''
     ORDER BY L ASC
     LIMIT 15
     LABEL B 'Name', F 'Position', G 'Company', H 'Stage', L 'Interview Date'",
  0),
"No interviews scheduled")
```

### 1H — 30-Day Application Trend SPARKLINE

**Step 1:** Build a 30-day count array. In any hidden area (e.g., D200:D229), paste this into D200:

```
=COUNTIFS(Pipeline!I:I,">="&(TODAY()-29),Pipeline!I:I,"<"&(TODAY()-28))
```

Then for D201: change `-29` to `-28` and `-28` to `-27`. Continue for all 30 cells.
OR use this array formula approach — paste into D200 only:

```
=ARRAYFORMULA(
  MMULT(
    (DATEVALUE(TEXT(IF(Pipeline!I2:I1000="","",Pipeline!I2:I1000),"YYYY-MM-DD"))
     >= TRANSPOSE(TODAY()-ROW(INDIRECT("1:30"))+1)) *
    (DATEVALUE(TEXT(IF(Pipeline!I2:I1000="","",Pipeline!I2:I1000),"YYYY-MM-DD"))
     < TRANSPOSE(TODAY()-ROW(INDIRECT("1:30"))+2)),
    SIGN(ROW(INDIRECT("1:"&COUNTA(Pipeline!I2:I1000))))
  )
)
```

> Note: If the ARRAYFORMULA is too complex for your Sheet, use 30 individual COUNTIFS cells instead.

**Step 2:** In your visible area (e.g., A69), paste the SPARKLINE:

```
=IFERROR(
  SPARKLINE(
    Dashboard!D200:D229,
    {"charttype","line";"color","#2563EB";"linewidth",2}
  ),
"")
```
Set row height to 80px for best visibility.

### 1I — Salary Distribution by Category (Cell E22)

```
=IFERROR(
  QUERY(Jobs!D:H,
    "SELECT D, AVG(G), AVG(H), COUNT(D)
     WHERE G>0 AND P='Active'
     GROUP BY D
     ORDER BY AVG(H) DESC
     LABEL D 'Category', AVG(G) 'Avg Min (MMK)', AVG(H) 'Avg Max (MMK)', COUNT(D) 'Jobs'",
  0),
"No data")
```

### 1J — Urgent Jobs Needing Action (Cell A70)

```
=IFERROR(
  QUERY(Jobs!A:R,
    "SELECT B, C, M, P, R
     WHERE N='TRUE' AND P='Active'
     ORDER BY M ASC
     LIMIT 10
     LABEL B 'Job Title', C 'Company', M 'Deadline', P 'Status', R 'Applications'",
  0),
"No urgent jobs")
```

---

## SECTION 2 — JOBS TAB FORMULA COLUMNS

Add these headers and formulas to your existing Jobs tab.
The script's `installFormulaColumns()` does this automatically,
but here they are for manual entry:

| Column | Header | Formula (row 2) | Purpose |
|--------|--------|-----------------|---------|
| R | applications_count | `=IFERROR(COUNTIF(Pipeline!E:E,A2),0)` | Auto-counted from Pipeline |
| S | hired_count | `=IFERROR(COUNTIFS(Pipeline!E:E,A2,Pipeline!H:H,"Hired"),0)` | Auto-counted from Pipeline |
| U | days_live | `=IF(P2="Active",TODAY()-DATEVALUE(TEXT(L2,"YYYY-MM-DD")),"—")` | How long since posting |
| V | conversion_rate | `=IF(R2>0,TEXT(S2/R2,"0%"),"—")` | Hired / Applications |
| W | deadline_status | See below | Visual deadline health |

**Column W (deadline_status) full formula:**
```
=IF(M2="","No deadline",
  IF(DATEVALUE(TEXT(M2,"YYYY-MM-DD"))<TODAY(),"⛔ Expired",
    IF(DATEVALUE(TEXT(M2,"YYYY-MM-DD"))-TODAY()<=3,"⚠️ Closes soon",
      "✅ Open"
    )
  )
)
```

---

## SECTION 3 — PIPELINE TAB FORMULA COLUMNS

| Column | Header | Formula (row 2) | Purpose |
|--------|--------|-----------------|---------|
| Y | days_in_stage | See below | Candidate staleness |
| Z | time_to_response_days | See below | Recruiter response speed |

**Column Y (days_in_stage):**
```
=IF(J2<>"",
  TODAY()-DATEVALUE(TEXT(J2,"YYYY-MM-DD")),
  TODAY()-DATEVALUE(TEXT(I2,"YYYY-MM-DD"))
)
```

**Column Z (time_to_response_days):**
```
=IF(AND(J2<>"",I2<>""),
  DATEVALUE(TEXT(J2,"YYYY-MM-DD"))-DATEVALUE(TEXT(I2,"YYYY-MM-DD")),
  "Pending"
)
```

> **Target:** Average Z column value < 3 days. Anything over 5 is a problem.

---

## SECTION 4 — COMPANIES TAB STRUCTURE

Create a tab named `Companies` with these exact column headers in Row 1:

```
A: company_id
B: name
C: industry
D: size
E: website
F: contact_name
G: contact_email
H: partnership_level
I: active_jobs
J: total_applications
K: total_hires
L: hire_rate
M: notes
```

**Auto-formula columns (paste in row 2, drag down):**

| Cell | Formula | What it does |
|------|---------|--------------|
| I2 | `=IFERROR(COUNTIFS(Jobs!C:C,B2,Jobs!P:P,"Active"),0)` | Count active jobs for this company |
| J2 | `=IFERROR(COUNTIF(Pipeline!G:G,B2),0)` | Total applications from this company's jobs |
| K2 | `=IFERROR(COUNTIFS(Pipeline!G:G,B2,Pipeline!H:H,"Hired"),0)` | Total hires |
| L2 | `=IFERROR(IF(J2>0,TEXT(K2/J2,"0%"),"—"),"—")` | Hire rate |

**Sample first row data:**
```
co-001 | KBZ Bank | Finance | Large | kbzbank.com | (blank) | (blank) | Gold | (auto) | (auto) | (auto) | (auto) | (blank)
```

---

## SECTION 5 — CONFIG TAB STRUCTURE

Create a tab named `Config`. Row 1 = headers. Columns A–F:

```
A: Categories       B: Job Types    C: Stages      D: Sources     E: Partnership    F: Job Status
Engineering         Full-time       Applied        Website        Bronze            Active
Design              Part-time       Shortlisted    Referral       Silver            Draft
Marketing           Contract        Interview      LinkedIn       Gold              Filled
Sales               Remote          Offer          Facebook       Exclusive         Expired
Finance             Internship      Hired          Telegram                         Closed
Operations                          Rejected       Walk-in
Healthcare                          Withdrawn      Agency
Education                                          Job Board
Customer Service                                   Other
Other
```

> **Important:** Data validation on Jobs and Pipeline tabs points to these ranges.
> Do not delete rows or reorder this list without updating the validation rules.

---

## SECTION 6 — ANALYTICS TAB FORMULAS

The script creates these automatically. For manual setup:

### Monthly Trends
```
=IFERROR(
  QUERY(Pipeline!A:I,
    "SELECT YEAR(I), MONTH(I), COUNT(A)
     WHERE A<>''
     GROUP BY YEAR(I), MONTH(I)
     ORDER BY YEAR(I) DESC, MONTH(I) DESC
     LABEL YEAR(I) 'Year', MONTH(I) 'Month', COUNT(A) 'Applications'",
  0),
"No data")
```

### Source Breakdown
```
=IFERROR(
  QUERY(Pipeline!Q:Q,
    "SELECT Q, COUNT(Q)
     WHERE Q<>''
     GROUP BY Q
     ORDER BY COUNT(Q) DESC
     LABEL Q 'Source', COUNT(Q) 'Applications'",
  0),
"No data")
```

### Stage Conversion Funnel (paste in cells D4:F10)
```
Stage         | Count                                    | % of Total
Applied       | =COUNTIF(Pipeline!H:H,"Applied")        | =TEXT(E5/COUNTA(Pipeline!A2:A),"0.0%")
Shortlisted   | =COUNTIF(Pipeline!H:H,"Shortlisted")    | =TEXT(E6/COUNTA(Pipeline!A2:A),"0.0%")
Interview     | =COUNTIF(Pipeline!H:H,"Interview")      | =TEXT(E7/COUNTA(Pipeline!A2:A),"0.0%")
Offer         | =COUNTIF(Pipeline!H:H,"Offer")          | =TEXT(E8/COUNTA(Pipeline!A2:A),"0.0%")
Hired         | =COUNTIF(Pipeline!H:H,"Hired")          | =TEXT(E9/COUNTA(Pipeline!A2:A),"0.0%")
```

### Average Salary by Category
```
=IFERROR(
  QUERY(Jobs!D:H,
    "SELECT D, AVG(G), AVG(H)
     WHERE G>0
     GROUP BY D
     ORDER BY AVG(H) DESC
     LABEL D 'Category', AVG(G) 'Avg Min Salary', AVG(H) 'Avg Max Salary'",
  0),
"No data")
```

---

## SECTION 7 — SCRIPT PROPERTIES TO SET

After pasting the script, go to:
**Extensions → Apps Script → Project Settings (gear icon) → Script Properties**

| Property Key | Value | Where to get it |
|-------------|-------|-----------------|
| `TELEGRAM_BOT_TOKEN` | `1234567890:ABCdef...` | Message @BotFather on Telegram → /newbot |
| `TELEGRAM_CHAT_ID` | `-1001234567890` | Message @userinfobot to get your chat ID |
| `DIGEST_EMAIL` | `lionzawlwin@gmail.com` | Your email |

---

## SECTION 8 — TRIGGERS INSTALLED BY installTriggers()

| Function | Schedule | Purpose |
|----------|----------|---------|
| `checkExpiredJobs` | Daily at 7 AM | Marks past-deadline jobs as Expired, emails you |
| `sendWeeklyDigest` | Monday at 8 AM | Full pipeline health email |
| `refreshDashboard` | Every hour | Updates KPI cells and 30-day trend data |
| `onEdit` | Instant (simple trigger) | Auto-timestamps, auto-fill, audit log — always on |

---

## SECTION 9 — CONDITIONAL FORMATTING REFERENCE

Applied automatically by `applyConditionalFormatting()`. For manual setup:

### Jobs Tab (range A2:W1000)
| Rule | Applies When | Background |
|------|-------------|------------|
| Active job | `=$P2="Active"` | `#DCFCE7` (light green) |
| Draft job | `=$P2="Draft"` | `#FEF9C3` (light yellow) |
| Expired/Closed | `=OR($P2="Expired",$P2="Closed")` | `#FEE2E2` (light red) |
| Urgent | `=$N2="TRUE"` on col B | `#FEF3C7` (gold) + bold |
| Closing soon | Text contains "⚠️" on col W | `#FFEDD5` (light orange) |

### Pipeline Tab — Stage Column (H2:H1000)
| Stage | Background | Font Color |
|-------|-----------|------------|
| Applied | `#DBEAFE` | `#1D4ED8` |
| Shortlisted | `#FEF9C3` | `#92400E` |
| Interview | `#FFEDD5` | `#C2410C` |
| Offer | `#EDE9FE` | `#5B21B6` |
| Hired | `#DCFCE7` | `#166534` |
| Rejected | `#F3F4F6` | `#6B7280` |

### Pipeline Tab — Row Rules (A2:Z1000)
| Rule | Formula | Background |
|------|---------|------------|
| Cold candidate | `=AND($Y2>7,$H2<>"Hired",$H2<>"Rejected")` | `#FEE2E2` (red) |
| Star candidate | `=$R2=5` | `#FEF3C7` (gold) |

---

## QUICK REFERENCE — COLUMN LETTERS

### Jobs Tab
```
A=job_id  B=title      C=company    D=category   E=type       F=location
G=sal_min H=sal_max    I=currency   J=desc       K=req        L=posted_at
M=deadline N=urgent    O=featured   P=status     Q=source     R=app_count
S=hired   T=notes      U=days_live  V=conv_rate  W=deadline_status
```

### Pipeline Tab
```
A=candidate_id   B=full_name      C=email          D=phone          E=job_id
F=job_title      G=company        H=stage          I=applied_at     J=stage_updated
K=assigned_to    L=interview_date M=interview_loc  N=sal_expected   O=sal_offered
P=notice_period  Q=source         R=rating         S=cv_url         T=offer_date
U=start_date     V=webhook_sent   W=notes          X=last_updated
Y=days_in_stage  Z=time_to_resp
```

---

*Generated for Lion Jobs Agency — Free Enterprise CRM*
*Compatible with Google Sheets free tier — no add-ons required*
