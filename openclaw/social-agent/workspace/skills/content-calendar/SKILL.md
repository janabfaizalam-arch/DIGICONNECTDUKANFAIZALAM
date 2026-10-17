---
name: content-calendar
description: Plan the coming week's social posts around Indian tax/compliance dates, festivals and services, and keep content/calendar.md current.
---

# Content calendar

Keeps `content/calendar.md` as the single plan. Used by the weekly planning cron and
whenever the owner asks "is hafte kya post karein?".

## Building the week

1. Read `content/calendar.md`, `content/posted.md` and the last 7 days of `memory/`.
2. Find **date hooks** for the next 7–10 days and verify each with a web search on an
   official source before using it:
   - Tax & compliance: GST return due dates (GSTR-1, GSTR-3B), ITR / audit due dates and
     any extension, advance-tax instalments, TDS return dates, PAN-Aadhaar linking or
     KYC deadlines when announced.
   - Schemes: new rounds or changes for PMEGP, Mudra, PM Vishwakarma, state schemes like
     CM Yuva — only if announced by an official source.
   - Festivals & days: Diwali, Dhanteras, Chhath, Holi, Eid, Christmas, New Year,
     Independence Day, Republic Day, MSME Day (27 June) etc. — greetings only, warm and
     brand-light.
3. Fill gaps with **evergreen service posts** (document checklists, common mistakes, "kaun
   apply kar sakta hai"). Prefer services not posted in the last 30 days.
4. Remember the website already auto-posts one service post every day at 10:00 IST when
   its pipeline is live (see `AGENTS.md`). Plan **at most one extra post per day**, and not
   on the same service the website covers that day if known.

## calendar.md format

```markdown
# Content calendar

## Week of 2026-10-19

| Date       | Time  | Topic                         | Page                       | Platforms        | Status   | Source |
| ---------- | ----- | ----------------------------- | -------------------------- | ---------------- | -------- | ------ |
| 2026-10-20 | 18:00 | GST before Diwali sale        | /services/gst-registration | fb, ig, x, tg    | idea     | gst.gov.in/... |
| 2026-10-21 | —     | Dhanteras greeting            | /                          | fb, ig, tg       | drafted  | —      |
```

Status flow: `idea` → `drafted` (draft file exists) → `approved` → `posted` (link in
`content/posted.md`) or `dropped`.

## Sending the plan

Send the owner a short list (date · topic · platforms) and ask which to draft. Draft only
what they pick. Never mark anything `approved` without their word.
