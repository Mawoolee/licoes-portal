import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const sessions = await db.attendanceSession.findMany({
    take: 5,
    include: {
      attendanceRecord: {
        include: { event: { select: { name: true, timeInStart: true, timeInEnd: true, timeOutStart: true, timeOutEnd: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  for (const s of sessions) {
    const ev = s.attendanceRecord.event
    console.log('Event:', ev.name)
    console.log('  Event timeInStart (raw UTC):', ev.timeInStart?.toISOString())
    console.log('  Session timeIn   (raw UTC):', s.timeIn.toISOString())
    console.log('  Session timeOut  (raw UTC):', s.timeOut?.toISOString() ?? '—')
    console.log('  timeIn in PH   :', s.timeIn.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }))
    console.log('  timeOut in PH  :', s.timeOut?.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }) ?? '—')
    console.log()
  }
}

main().catch(console.error).finally(() => db.$disconnect())
