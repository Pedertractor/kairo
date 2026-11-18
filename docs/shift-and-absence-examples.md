# Shift, absence, and occupation examples

Examples from the product discussion. Times are wall-clock in `America/Sao_Paulo`. Dates like `10/07` are day/month (10 July). Occupation is `round(loggedSeconds / availabilitySeconds * 100)`, the same formula used on analytics and the admin dashboard. Only shifts starting Monday–Friday add available time. An overnight shift starting Friday continues into Saturday; shifts starting Saturday or Sunday are excluded.

Available time is evaluated per shift occurrence: presence is the first 9h 48min of the scheduled shift (8h 48min of work plus 1h of lunch) minus overlapping absences, then lunch is deducted and the result capped at 8h 48min (see section 9). Scheduled hours later in the report range are included, matching the existing calculation and tests. Lunch punches (`firstExit`, `secondEntry`) are not stored; only `firstEntry` and `secondExit` define the shift, so the shift includes lunch.

These cases are covered by `npm test` in `backend`.

---

## 1. Shift history and limits

The employee comes from `/employee/get`. The shift stored for occupancy is the interval from `firstEntry` to `secondExit`.

| Field | Example payload | Stored as |
| --- | --- | --- |
| `firstEntry` | `1970-01-01T09:15:00.000Z` | 06:15 |
| `firstExit` / `secondEntry` | lunch punches | not stored (lunch is deducted by rule) |
| `secondExit` | `1970-01-01T18:03:00.000Z` | 15:03 |

Each change (API sync or a leader edit) closes the previous `UserShiftPeriod` and opens a new one, so occupancy can use the shift that was valid on that day.

---

## 2. Late start with no absence

**Setup**

- Day: 10/07
- Shift: 06:15–15:03
- No absence
- First time entry starts at 09:15
- Snapshot at 12:00

**Expected**

- Available time includes the idle gap 06:15–09:15 (three hours), plus worked time 09:15–12:00.
- Logged time is only 09:15–12:00.
- Occupation is pulled down (about 35% at 12:00 against 7h 48min available: the 8h 48min shift minus 1h of lunch). Those three hours are lost if nobody marked an absence.

---

## 3. Late start with an absence until just before work

**Setup**

- Same shift and day
- A team admin marks the person absent from 06:15 until 09:14
- Time entry starts at 09:15
- Snapshot at 12:00

**Expected**

- 06:15–09:14 is removed from available time.
- Occupation is about 47% at 12:00 (2h 45min logged / 5h 49min available; under 6h of presence, so no lunch is deducted); at shift end, working the remaining time brings it close to 100%.
- The person had fewer available hours; the delay does not look like idle occupation.

---

## 4. Future absence

A person who already knows they will be off tomorrow in a given window can register that absence in advance.

**Setup**

- Today: 09/09
- Absence: 10/09 06:15–10:00 (or open-ended)

**Expected**

- Creation is allowed even with no time entry on 10/09.
- `user.absent` stays false until the start time is reached.
- Running timers are not paused when the absence is only scheduled.
- On the create form, an open end for a future absence is labeled **Fim indeterminado** (not **Em andamento**).

---

## 5. Creating absences from the Ausências tab

| When the absence starts | Rule |
| --- | --- |
| Future day | Always allowed |
| Past day | Allowed only if that user already has a time entry on that day |
| Today | Allowed only if that user has **not** started any time entry yet |

Team admins see and create absences only for members of teams they administer. Application admins have no global access on this page. Regular members can create only their own absences. Only **future** absences can be cancelled.

---

## 6. Early return during a planned absence

**Setup**

- Day: 10/07
- Absence already saved: 06:15–10:00
- The person arrives and starts a time entry at 09:00

**Expected**

- Starting the time entry is allowed while the absence is still covering now.
- The absence end is updated to **09:00** (the time-entry start).
- 06:15–09:00 stays as absence (available time is reduced).
- 09:00 onward counts as work. Occupation is not charged for the cancelled remainder 09:00–10:00.

If they start a time entry when no absence covers that instant, the absence records are left unchanged.

---

## 7. Multi-team availability (Analytics)

A person in more than one team does **not** get 8h 48min of disponibilidade on every team. Capacity follows the team of their **last TimeEntry**.

**Rule**

- The last apontamento (including previous days) owns disponibilidade until the person starts an entry on another team.
- Ownership switches at the new entry’s `startedAt`. Remaining capacity from that instant goes to the new team.
- If the person never pointed, no team receives those hours (`0` available).
- Logged hours stay team-scoped (only entries on the viewed team).

**Example**

- Shift: 06:15–15:03
- Last entry on Friday was on Team A
- Monday: first entry on Team B starts at 13:00

| Team | Available window |
| --- | --- |
| Team A | 06:15–13:00 (includes morning idle) |
| Team B | 13:00–14:03 (the last hour is the lunch deduction) |
| Other team they belong to but never “own” | `0` |

This applies on Analytics (`/analytics`). The admin Painel still counts each person once globally.


## 8. Overnight shifts

An end earlier than the start means the next day: **20:00–02:00** is six hours. Equal bounds are invalid; the HR API's 00:00–00:00 placeholder remains ignored. Manual edits and HR imports follow the same rule.

### Work day ("dia da jornada")

Everything from an overnight shift counts on the day the shift started, both logged time and availability. For collaborators on an overnight schedule, the day boundary is not midnight but the middle of the off-duty gap of the previous day's shift. With 18:00–02:00 the gap is 02:00–18:00, so Monday's work day runs from Monday 10:00 to Tuesday 10:00. Collaborators without an overnight shift keep calendar days.

Shift 18:00–02:00 (8h of presence, 1h of lunch), entries Monday 18:00–Tuesday 02:00 and Tuesday 18:00–Wednesday 02:00:

| Report | Logged | Available |
| --- | --- | --- |
| Monday | 8h | 7h |
| Tuesday | 8h | 7h |

A Monday–Friday report includes Friday night up to Saturday 02:00, and leaves out the previous Friday night.

Before this rule, Monday showed 6h logged while Tuesday to Friday showed 8h, because each weekday received the previous night's hours after midnight and nobody works Sunday night.

Analytics, the admin dashboard (per-day usage too) and the monthly occupation all apply this rule (`backend/src/utils/work-day.ts`). Queries load time entries, absences and shifts one day wider on each side to cover the hours past midnight. An overnight occurrence keeps the schedule it started with, so the previous day's shift decides the boundary.

Raw availability by calendar window, for a shift starting Monday 06/07/2026 at 20:00 (used when no work-day bounds are given):

| Calendar window | Available time before absences |
| --- | --- |
| Monday 00:00–24:00 | 4 hours (20:00–24:00) |
| Tuesday 00:00–02:00 | 2 hours carried from Monday |
| Monday 20:00–Tuesday 02:00 | 6 hours |

The 9h 48min presence window, lunch and the 8h 48min cap apply once to the continuous occurrence, before clipping to the report. For 20:00–10:00, the window ends at 05:48 and capacity at 04:48 the next day. An absence from 23:00–01:00 leaves 7h 48min of presence, so 6h 48min is available; later hours do not refill it.

Friday 20:00–Saturday 02:00 contributes all six hours. Sunday 20:00–Monday 02:00 contributes none. An overnight occurrence uses the schedule effective at its start; an edit after it starts applies to later occurrences. Reports load the previous local start day's shift history to preserve carry-over, even across month/year boundaries. Absences and team switches apply at their actual timestamps.

These examples are covered in shift parsing/schema and work-availability tests. No database migration or shift-history rewrite is needed.

---

## 9. Lunch deduction

Nobody may work more than 6 hours without a break, so a day with more than 6h of presence includes lunch. Presence is the first 9h 48min of the shift minus absences.

- Lunch = presence beyond 6h, up to 1h. Available = presence − lunch, capped at 8h 48min.
- At or below 6h of presence nothing is deducted. Between 6h and 7h availability stays at 6h, so there is no step.
- The deduction is trimmed from the end of the day, keeping the morning.
- Rare days where someone works past 6h without a break can show occupation slightly above 100%.

Shift 08:00–17:48 (9h 48min):

| Absence | Presence | Lunch | Available |
| --- | --- | --- | --- |
| none | 9h 48min | 1h | 8h 48min |
| 16:00–17:48 | 8h | 1h | 7h |
| 15:00–17:48 | 7h | 1h | 6h |
| 14:30–17:48 | 6h 30min | 30min | 6h |
| 14:00–17:48 | 6h | 0 | 6h |
| 08:00–12:00 | 5h 48min | 0 | 5h 48min |
| 10:00–11:00 | 8h 48min | 1h | 7h 48min |

A shift of 06:15–15:03 (8h 48min including lunch) gives 7h 48min available.
