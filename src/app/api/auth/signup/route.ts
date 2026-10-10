import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const DWCL_DOMAIN = '@dwcl.edu.ph'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    // Validate inputs
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'All fields are required.' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Enforce DWCL domain
    if (!normalizedEmail.endsWith(DWCL_DOMAIN)) {
      return NextResponse.json(
        { message: `Please use your DWCL school email (${DWCL_DOMAIN}).` },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    // Check for existing account
    const existing = await db.officer.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Create officer with PENDING status and no roles yet
    await db.officer.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        roles: [],
        status: 'PENDING',
      },
    })

    // Log the sign-up event
    await db.auditLog.create({
      data: {
        action: 'ACCOUNT_SIGNUP',
        targetRecord: 'Officer',
        recordId: normalizedEmail,
        newVal: JSON.stringify({ name: name.trim(), email: normalizedEmail, status: 'PENDING' }),
      },
    })

    return NextResponse.json({ message: 'Account created successfully.' }, { status: 201 })
  } catch (err) {
    console.error('[signup] error:', err)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}
