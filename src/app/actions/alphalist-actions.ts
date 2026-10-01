'use server'

import * as XLSX from 'xlsx'
import { db } from '@/lib/db'

export interface StudentRecord {
  id: string
  fullName: string
  course: string
  yearLevel: string
  section: string
}

// Global In-Memory Store bilang fallback kung wala pang database setup
let globalStudentMap: Record<string, StudentRecord> = {}

export async function uploadAlphaListAction(formData: FormData) {
  try {
    const file = formData.get('file') as File | null
    if (!file) {
      return { success: false, message: 'Walang file na napili.' }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    const extractedStudents: StudentRecord[] = []

    // I-iterate ang lahat ng sheets (BSIT, BSCS, BSEE, BSCE CEM, BSCE SE, BLIS, atbp.)
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toLowerCase().includes('wala sa list')) continue

      const sheet = workbook.Sheets[sheetName]
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      if (!rows || rows.length === 0) continue

      // Hanapin ang mga column headers kung saan nakalagay ang "ID #"
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]
        if (!row) continue

        for (let c = 0; c < row.length - 2; c++) {
          const cellVal = String(row[c] || '').trim()

          if (cellVal === 'ID #') {
            const idCol = c
            const nameCol = c + 1
            const yrCol = c + 2

            // Kunin ang mga sumusunod na rows sa ilalim ng header na ito
            for (let subR = r + 1; subR < rows.length; subR++) {
              const subRow = rows[subR]
              if (!subRow) continue

              const rawId = subRow[idCol]
              const rawName = subRow[nameCol]
              const rawYr = subRow[yrCol]

              if (rawId && rawName) {
                const cleanId = String(rawId).split('.')[0].trim().padStart(8, '0')
                const cleanName = String(rawName).trim()
                const cleanYr = String(rawYr || '1').trim()

                extractedStudents.push({
                  id: cleanId,
                  fullName: cleanName,
                  course: sheetName,
                  yearLevel: cleanYr,
                  section: `${sheetName} ${cleanYr}`,
                })
              }
            }
          }
        }
      }
    }

if (extractedStudents.length === 0) {
      return { success: false, message: 'Walang nahanap na valid student records sa Excel file.' }
    }

    // 1. Isave sa In-Memory Store
    extractedStudents.forEach((student) => {
      globalStudentMap[student.id] = student
      const unpadded = String(parseInt(student.id, 10))
      globalStudentMap[unpadded] = student
    })

    // 2. Isave/I-update sa Prisma Database (Bulk Upsert)
    await Promise.all(
      extractedStudents.map((student) =>
        db.student.upsert({
          where: { id: student.id },
          update: {
            fullName: student.fullName,
            course: student.course,
            yearLevel: student.yearLevel,
            section: student.section,
          },
          create: {
            id: student.id,
            fullName: student.fullName,
            course: student.course,
            yearLevel: student.yearLevel,
            section: student.section,
          },
        })
      )
    )

    return {
      success: true,
      count: extractedStudents.length,
      message: `Matagumpay na na-import at na-save sa database ang ${extractedStudents.length} estudyante!`,
    }
  } catch (error) {
    console.error('Alpha List Upload Error:', error)
    return { success: false, message: 'Nagka-error sa pag-parse ng Excel file.' }
  }
}

// Action para sa paghahanap ng estudyante tuwing nag-i-scan sa Attendance Terminal
// Checks in-memory map first (fast), falls back to DB if not found (handles server restarts)
export async function lookupStudentAction(scannedId: string) {
  const cleanId = scannedId.trim()
  const paddedId = cleanId.padStart(8, '0')
  const unpaddedId = String(parseInt(cleanId, 10) || cleanId)

  // 1. Check in-memory map first (fastest path)
  const inMemory =
    globalStudentMap[paddedId] ||
    globalStudentMap[unpaddedId] ||
    globalStudentMap[cleanId]

  if (inMemory) {
    return { found: true, student: inMemory }
  }

  // 2. Fall back to database (handles server restarts / different instances)
  try {
    const dbStudent = await db.student.findFirst({
      where: {
        OR: [
          { id: paddedId },
          { id: unpaddedId },
          { id: cleanId },
        ],
      },
    })

    if (dbStudent) {
      // Re-populate in-memory cache so next lookup is fast
      const record: StudentRecord = {
        id: dbStudent.id,
        fullName: dbStudent.fullName,
        course: dbStudent.course,
        yearLevel: dbStudent.yearLevel,
        section: dbStudent.section,
      }
      globalStudentMap[dbStudent.id] = record
      globalStudentMap[String(parseInt(dbStudent.id, 10))] = record

      return { found: true, student: record }
    }
  } catch (err) {
    console.error('DB lookup error:', err)
  }

  return { found: false, student: null }
}

// Server action to fetch all students for the admin preview table
export async function getStudentsAction(page = 1, pageSize = 50, search = '') {
  try {
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { id: { contains: search } },
            { course: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        orderBy: [{ course: 'asc' }, { yearLevel: 'asc' }, { fullName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.student.count({ where }),
    ])

    return { success: true, students, total, page, pageSize }
  } catch (error) {
    console.error('getStudentsAction error:', error)
    return { success: false, students: [], total: 0, page, pageSize }
  }
}