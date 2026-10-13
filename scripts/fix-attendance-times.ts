/**
 * One-time script: add 8 hours to all AttendanceSession timeIn/timeOut
 * for sessions that were stored in UTC instead of PH time.
 *
 * Only affects sessions where timeIn is before 12:00 PM UTC
 * (i.e., times that were clearly stored without +08:00 offset).
 *
 * Run with:
 *   npx ts-node --project tsconfig.seed.json scripts/fix-attendance-times.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // Find all sessions where timeIn looks like it was stored as UTC
  // (before noon UTC = before 8 PM PH time, which means it's off)
  const sessions = await db.attendanceSession.findMany({
    include: {
      attendanceRecord: {
        include: { event: true },
      },
    },
  })

  let fixed = 0

  for (const session of sessions) {
    const event = session.attendanceRecord.event
    const eventTimeInStart = event.timeInStart
    if (!eventTimeInStart) continue

    // If the stored timeIn is more than 7 hours BEFORE the event's timeInStart,
    // it means it was stored without the +08:00 offset — fix it.
    const diffHours = (eventTimeInStart.getTime() - session.timeIn.getTime()) / (1000 * 60 * 60)

    if (diffHours > 6 && diffHours < 10) {
      // Looks like an 8-hour offset issue — add 8 hours
      const correctedTimeIn = new Date(session.timeIn.getTime() + 8 * 60 * 60 * 1000)
      const correctedTimeOut = session.timeOut
        ? new Date(session.timeOut.getTime() + 8 * 60 * 60 * 1000)
        : null

      await db.attendanceSession.update({
        where: { id: session.id },
        data: {
          timeIn: correctedTimeIn,
          ...(correctedTimeOut ? { timeOut: correctedTimeOut } : {}),
        },
      })

      console.log(
        `Fixed session ${session.id}: ${session.timeIn.toISOString()} → ${correctedTimeIn.toISOString()}`
      )
      fixed++
    }
  }

  console.log(`\nDone. Fixed ${fixed} session(s).`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
