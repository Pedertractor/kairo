# Shift, absence, and occupation examples

Examples from the product discussion. Times are wall-clock in `America/Sao_Paulo`. Dates like `10/07` are day/month (10 July). Occupation is `round(loggedSeconds / availabilitySeconds * 100)`, the same formula used on analytics and the admin dashboard.

Available time is the elapsed portion of the person's shift, minus overlapping absences. Time that has not happened yet is not counted. Lunch punches (`firstExit`, `secondEntry`) are ignored; only `firstEntry` and `secondExit` define the shift.

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
- Occupation is pulled down (about 48% at 12:00). Those three hours are lost if nobody marked an absence.

---

## 3. Late start with an absence until just before work

**Setup**

- Same shift and day
- Admin marks the person absent from 06:15 until 09:14
- Time entry starts at 09:15
- Snapshot at 12:00

**Expected**

- 06:15–09:14 is removed from available time.
- Occupation stays close to 100% (99% at 12:00 because of the one-minute gap 09:14–09:15).
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

Admins see absences they created and absences of people they manage. Regular users see only their own. Only **future** absences can be cancelled.

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
