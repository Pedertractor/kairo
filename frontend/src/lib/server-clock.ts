/**
 * Estimates the gap between this device's clock and the server's, using the
 * HTTP `Date` header of API responses. Shop-floor tablets often have a clock
 * that is minutes behind, which made running timers stay at 00:00 (elapsed
 * time came out negative and was clamped to zero).
 *
 * The header has one-second precision, so small gaps are ignored: devices with
 * a correct clock keep using `Date.now()` unchanged.
 */
const MIN_SKEW_MS = 2_000
const DATE_HEADER_PRECISION_MS = 1_000

let offsetMs = 0

export function syncServerClock(dateHeader: string | null): void {
  if (!dateHeader) return
  const serverMs = Date.parse(dateHeader)
  if (Number.isNaN(serverMs)) return

  // The header is truncated to the second; assume the middle of that second.
  const estimate = serverMs + DATE_HEADER_PRECISION_MS / 2 - Date.now()

  if (Math.abs(estimate) < MIN_SKEW_MS) {
    offsetMs = 0
    return
  }
  // Avoid jitter from the header's rounding once an offset is in place.
  if (Math.abs(estimate - offsetMs) < DATE_HEADER_PRECISION_MS * 1.5) return
  offsetMs = estimate
}

/** Current time in milliseconds, corrected to the server's clock. */
export function serverNow(): number {
  return Date.now() + offsetMs
}
