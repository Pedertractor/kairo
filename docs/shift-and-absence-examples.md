# Shift, absence, and occupation examples

Examples from the product discussion. Times are wall-clock in `America/Sao_Paulo`. Dates like `10/07` are day/month (10 July). Occupation is `round(loggedSeconds / availabilitySeconds * 100)`, the same formula used on analytics and the admin dashboard. Only shifts starting Monday–Friday add available time. An overnight shift starting Friday continues into Saturday; shifts starting Saturday or Sunday are excluded.

Available time is the full scheduled shift within the report range, capped at 8h 48min per shift occurrence, minus overlapping absences. Scheduled hours later in the report range are included, matching the existing calculation and tests. Lunch punches (`firstExit`, `secondEntry`) are ignored; only `firstEntry` and `secondExit` define the shift.

These cases are covered by `npm test` in `backend`.

---

## 1. Shift history and limits

The employee comes from `/employee/get`. The shift stored for occupancy is the interval from `firstEntry` to `secondExit`.

| Field | Example payload | Stored as |
| --- | --- | --- |
| `firstEntry` | `1970-01-01T09:15:00.000Z` | 06:15 |
| `firstExit` / `secondEntry` | lunch punches | ignored |
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
- Occupation is pulled down (about 31% at 12:00 against the full 8h 48min shift). Those three hours are lost if nobody marked an absence.

---

## 3. Late start with an absence until just before work

**Setup**

- Same shift and day
- A team admin marks the person absent from 06:15 until 09:14
- Time entry starts at 09:15
- Snapshot at 12:00

**Expected**

- 06:15–09:14 is removed from available time.
- Occupation is about 47% at 12:00 (2h 45min logged / 5h 49min available); at shift end, working the remaining time brings it close to 100%.
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
| Team B | 13:00–15:03 |
| Other team they belong to but never “own” | `0` |

This applies on Analytics (`/analytics`). The admin Painel still counts each person once globally.


## 8. Overnight shifts

An end earlier than the start means the next day: **20:00–02:00** is six hours. Equal bounds are invalid; the HR API's 00:00–00:00 placeholder remains ignored. Manual edits and HR imports follow the same rule.

For a shift starting Monday 06/07/2026 at 20:00:

| Report window | Available time before absences |
| --- | --- |
| Monday | 4 hours (20:00–24:00) |
| Tuesday 00:00–02:00 | 2 hours carried from Monday |
| Monday 20:00–Tuesday 02:00 | 6 hours |

A recurring Tuesday evening shift contributes its own hours to a full Tuesday report. Daily totals and combined-range totals count each instant once. Logged time stays on its actual calendar date, so occupation compares the same report window.

The 8h 48min cap applies once to the continuous occurrence, before clipping to the report or subtracting absences. For 20:00–10:00, capacity ends at 04:48 the next day. An absence from 23:00–01:00 removes two hours and does not refill the cap with later hours.

Friday 20:00–Saturday 02:00 contributes all six hours. Sunday 20:00–Monday 02:00 contributes none. An overnight occurrence uses the schedule effective at its start; an edit after it starts applies to later occurrences. Reports load the previous local start day's shift history to preserve carry-over, even across month/year boundaries. Absences and team switches apply at their actual timestamps.

These examples are covered in shift parsing/schema and work-availability tests. No database migration or shift-history rewrite is needed.
