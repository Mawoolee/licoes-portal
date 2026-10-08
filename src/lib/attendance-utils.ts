export type WindowStatus = 'TIME_IN' | 'TIME_OUT' | 'OUTSIDE' | 'UNCONFIGURED'

/**
 * Determines the current scan mode based on the event's 4 time windows.
 * Pure utility — no server-only deps, safe to import anywhere.
 */
export function getWindowStatus(
  event: {
    timeInStart: Date | null
    timeInEnd: Date | null
    timeOutStart: Date | null
    timeOutEnd: Date | null
  },
  now: Date = new Date()
): { status: WindowStatus; isLate: boolean } {
  if (!event.timeInStart || !event.timeInEnd || !event.timeOutStart || !event.timeOutEnd) {
    return { status: 'UNCONFIGURED', isLate: false }
  }

  const timeInStart  = new Date(event.timeInStart)
  const timeInEnd    = new Date(event.timeInEnd)
  const timeOutStart = new Date(event.timeOutStart)
  const timeOutEnd   = new Date(event.timeOutEnd)

  if (now >= timeInStart && now <= timeInEnd) {
    return { status: 'TIME_IN', isLate: false }
  }
  if (now >= timeOutStart && now <= timeOutEnd) {
    return { status: 'TIME_OUT', isLate: false }
  }
  // Between time-in cut-off and time-out window start → late TIME_IN allowed
  if (now > timeInEnd && now < timeOutStart) {
    return { status: 'TIME_IN', isLate: true }
  }
  return { status: 'OUTSIDE', isLate: false }
}
