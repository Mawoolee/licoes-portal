import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱  Seeding LICOES database...')

  // ── 1. ADMIN Officer Account ────────────────────────────────────────────────
  // Change these credentials before deploying to production!
  const adminEmail = 'admin@dwcl.edu.ph'
  const adminPassword = 'LIC0ES@Admin2026!'

  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.officer.upsert({
    where: { email: adminEmail },
    update: { passwordHash, roles: ['ADMIN'] },
    create: {
      name: 'LICOES Administrator',
      email: adminEmail,
      passwordHash,
      roles: ['ADMIN'],
    },
  })
  console.log(`✅  Admin officer: ${admin.email}`)

  // ── 2. Treasurer Account ────────────────────────────────────────────────────
  const treasurerEmail = 'treasurer@dwcl.edu.ph'
  const treasurerPassword = 'LIC0ES@Treasurer2026!'

  const treasurer = await prisma.officer.upsert({
    where: { email: treasurerEmail },
    update: { passwordHash: await bcrypt.hash(treasurerPassword, 12), roles: ['TREASURER'] },
    create: {
      name: 'LICOES Treasurer',
      email: treasurerEmail,
      passwordHash: await bcrypt.hash(treasurerPassword, 12),
      roles: ['TREASURER'],
    },
  })
  console.log(`✅  Treasurer officer: ${treasurer.email}`)

  // ── 3. Active Collection Period & Fee Items ─────────────────────────────────
  // A.Y. 2026–2027 1st Semester
  const period = await prisma.collectionPeriod.upsert({
    where: { id: 'ay-2026-2027-1st' },
    update: { isActive: true },
    create: {
      id: 'ay-2026-2027-1st',
      name: 'A.Y. 2026–2027 1st Semester',
      isActive: true,
    },
  })
  console.log(`✅  Collection Period: ${period.name}`)

  // Membership Fee — PHP 250, required, no shirt size
  const membershipFee = await prisma.feeItem.upsert({
    where: { id: 'fee-membership-2026-1st' },
    update: {},
    create: {
      id: 'fee-membership-2026-1st',
      collectionPeriodId: period.id,
      name: 'Membership Fee',
      amount: 250.00,
      requiresShirtSize: false,
      isRequired: true,
    },
  })
  console.log(`✅  Fee Item: ${membershipFee.name} — PHP ${membershipFee.amount}`)

  // Intramurals Shirt — PHP 250, optional, requires shirt size
  const intramuralsShirt = await prisma.feeItem.upsert({
    where: { id: 'fee-intramurals-shirt-2026-1st' },
    update: {},
    create: {
      id: 'fee-intramurals-shirt-2026-1st',
      collectionPeriodId: period.id,
      name: 'Intramurals Shirt',
      amount: 250.00,
      requiresShirtSize: true,
      isRequired: false,
    },
  })
  console.log(`✅  Fee Item: ${intramuralsShirt.name} — PHP ${intramuralsShirt.amount}`)

  console.log('\n🎉  Seed complete!')
  console.log('\nOfficer Accounts:')
  console.log(`   Admin     → ${adminEmail}  /  ${adminPassword}`)
  console.log(`   Treasurer → ${treasurerEmail}  /  ${treasurerPassword}`)
  console.log('\n⚠️   Change these passwords immediately after first login!\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
