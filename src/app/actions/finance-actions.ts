'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, Role } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOfficerRole } from '@/lib/session'

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

export type CreateCashAdvanceInput = {
  recipientName: string
  purpose: string
  amount: number
  dateIssued: string
}

export type CreateExpenseInput = {
  cashAdvanceId: string
  description: string
  vendorName: string
  amount: number
  datePurchased: string
}

export type CreateLiquidationInput = {
  cashAdvanceId: string
  expenseIds: string[]
  totalLiquidated: number
  confirmed?: boolean
}

export type CashAdvanceSummary = {
  id: string
  recipientName: string
  purpose: string
  amount: number
  dateIssued: string
  status: string
  createdByName: string
  expensesCount: number
}

export type ExpenseSummary = {
  id: string
  cashAdvanceId: string
  description: string
  vendorName: string
  amount: number
  datePurchased: string
  acknowledgmentReceiptNumber: string | null
  createdAt: string
  evidenceCount: number
}

export type LiquidationRecordSummary = {
  id: string
  cashAdvanceId: string
  purpose: string
  recipientName: string
  totalAdvanced: number
  totalLiquidated: number
  unliquidatedBalance: number
  submittedAt: string
}

const toMoney = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0
  return Number(value)
}

const requireFinanceOfficer = async () => {
  return requireOfficerRole([Role.ADMIN, Role.FINANCE_OFFICER])
}

export async function createCashAdvanceAction(
  data: CreateCashAdvanceInput,
): Promise<ActionResult> {
  const officer = await requireFinanceOfficer()

  const recipientName = data.recipientName.trim()
  const purpose = data.purpose.trim()
  const amount = Number(data.amount)
  const dateIssued = new Date(data.dateIssued)

  if (!recipientName || recipientName.length > 100) {
    return { success: false, error: 'Recipient name is required and must be 100 characters or less.' }
  }

  if (!purpose || purpose.length > 255) {
    return { success: false, error: 'Purpose is required and must be 255 characters or less.' }
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Amount must be a positive number.' }
  }

  if (Number.isNaN(dateIssued.getTime())) {
    return { success: false, error: 'Please provide a valid issued date.' }
  }

  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (dateIssued > today) {
    return { success: false, error: 'Issued date cannot be in the future.' }
  }

  try {
    const advance = await db.cashAdvance.create({
      data: {
        recipientName,
        purpose,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        dateIssued,
        createdByOfficerId: officer.id,
      },
    })

    await db.auditLog.create({
      data: {
        officerId: officer.id,
        action: 'CASH_ADVANCE_CREATED',
        targetRecord: 'CashAdvance',
        recordId: advance.id,
        previousVal: null,
        newVal: JSON.stringify({ recipientName, purpose, amount: amount.toFixed(2), dateIssued: dateIssued.toISOString() }),
        timestamp: new Date(),
      },
    })

    revalidatePath('/finance/cash-advances')
    revalidatePath('/finance')
    return { success: true }
  } catch (error) {
    console.error('createCashAdvanceAction error:', error)
    return { success: false, error: 'Unable to create cash advance.' }
  }
}

export async function getCashAdvancesAction(): Promise<CashAdvanceSummary[]> {
  const advances = await db.cashAdvance.findMany({
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { expenses: true } },
    },
    orderBy: { dateIssued: 'desc' },
  })

  return advances.map((advance) => ({
    id: advance.id,
    recipientName: advance.recipientName,
    purpose: advance.purpose,
    amount: toMoney(advance.amount),
    dateIssued: advance.dateIssued.toISOString(),
    status: advance.status,
    createdByName: advance.createdBy.name,
    expensesCount: advance._count.expenses,
  }))
}

export async function createExpenseAction(
  data: CreateExpenseInput,
): Promise<ActionResult> {
  const officer = await requireFinanceOfficer()

  const description = data.description.trim()
  const vendorName = data.vendorName.trim()
  const amount = Number(data.amount)
  const datePurchased = new Date(data.datePurchased)

  if (!description || description.length > 255) {
    return { success: false, error: 'Description is required and must be 255 characters or less.' }
  }

  if (!vendorName || vendorName.length > 100) {
    return { success: false, error: 'Vendor name is required and must be 100 characters or less.' }
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Expense amount must be greater than zero.' }
  }

  if (Number.isNaN(datePurchased.getTime())) {
    return { success: false, error: 'Please provide a valid purchase date.' }
  }

  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (datePurchased > today) {
    return { success: false, error: 'Purchase date cannot be in the future.' }
  }

  const cashAdvance = await db.cashAdvance.findUnique({
    where: { id: data.cashAdvanceId },
  })

  if (!cashAdvance) {
    return { success: false, error: 'Cash advance not found.' }
  }

  if (cashAdvance.status !== 'OPEN') {
    return { success: false, error: 'Only open cash advances can accept new expenses.' }
  }

  try {
    const expense = await db.expense.create({
      data: {
        cashAdvanceId: data.cashAdvanceId,
        description,
        vendorName,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        datePurchased,
      },
    })

    await db.auditLog.create({
      data: {
        officerId: officer.id,
        action: 'EXPENSE_CREATED',
        targetRecord: 'Expense',
        recordId: expense.id,
        previousVal: null,
        newVal: JSON.stringify({ description, vendorName, amount: amount.toFixed(2), datePurchased: datePurchased.toISOString() }),
        timestamp: new Date(),
      },
    })

    revalidatePath('/finance/cash-advances')
    revalidatePath('/finance/cash-advances/' + data.cashAdvanceId)
    revalidatePath('/finance/expenses')
    return { success: true }
  } catch (error) {
    console.error('createExpenseAction error:', error)
    return { success: false, error: 'Unable to create expense.' }
  }
}

export async function getExpensesByCashAdvanceAction(
  cashAdvanceId: string,
): Promise<ExpenseSummary[]> {
  const expenses = await db.expense.findMany({
    where: { cashAdvanceId },
    include: {
      evidence: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return expenses.map((expense) => ({
    id: expense.id,
    cashAdvanceId: expense.cashAdvanceId,
    description: expense.description,
    vendorName: expense.vendorName,
    amount: toMoney(expense.amount),
    datePurchased: expense.datePurchased.toISOString(),
    acknowledgmentReceiptNumber: expense.acknowledgmentReceiptNumber,
    createdAt: expense.createdAt.toISOString(),
    evidenceCount: expense.evidence.length,
  }))
}

export async function getAllExpensesAction(): Promise<ExpenseSummary[]> {
  const expenses = await db.expense.findMany({
    include: { evidence: true },
    orderBy: { createdAt: 'desc' },
  })

  return expenses.map((expense) => ({
    id: expense.id,
    cashAdvanceId: expense.cashAdvanceId,
    description: expense.description,
    vendorName: expense.vendorName,
    amount: toMoney(expense.amount),
    datePurchased: expense.datePurchased.toISOString(),
    acknowledgmentReceiptNumber: expense.acknowledgmentReceiptNumber,
    createdAt: expense.createdAt.toISOString(),
    evidenceCount: expense.evidence.length,
  }))
}

export async function createLiquidationRecordAction(
  data: CreateLiquidationInput,
): Promise<ActionResult> {
  const officer = await requireFinanceOfficer()

  if (!data.cashAdvanceId) {
    return { success: false, error: 'Cash advance is required.' }
  }

  if (!Array.isArray(data.expenseIds) || data.expenseIds.length === 0) {
    return { success: false, error: 'Please select at least one expense to liquidate.' }
  }

  const cashAdvance = await db.cashAdvance.findUnique({
    where: { id: data.cashAdvanceId },
    include: { expenses: true },
  })

  if (!cashAdvance) {
    return { success: false, error: 'Cash advance not found.' }
  }

  if (cashAdvance.status !== 'OPEN') {
    return { success: false, error: 'Only open cash advances can be liquidated.' }
  }

  const uniqueExpenseIds = [...new Set(data.expenseIds)]
  const selectedExpenses = cashAdvance.expenses.filter((expense) => uniqueExpenseIds.includes(expense.id))

  if (selectedExpenses.length !== uniqueExpenseIds.length) {
    return { success: false, error: 'One or more expenses do not belong to the selected cash advance.' }
  }

  const existing = await db.liquidationExpense.findMany({
    where: { expenseId: { in: uniqueExpenseIds } },
  })

  if (existing.length > 0) {
    return { success: false, error: 'One or more selected expenses are already included in an existing liquidation.' }
  }

  const totalLiquidated = selectedExpenses.reduce((sum, expense) => sum + toMoney(expense.amount), 0)
  const reportedTotal = Number(data.totalLiquidated)

  if (!Number.isFinite(reportedTotal) || reportedTotal <= 0) {
    return { success: false, error: 'A valid liquidation total is required.' }
  }

  if (Math.abs(totalLiquidated - reportedTotal) > 0.01) {
    return { success: false, error: 'Selected expenses total does not match the liquidation total.' }
  }

  if (totalLiquidated > toMoney(cashAdvance.amount)) {
    return { success: false, error: 'Total liquidated cannot exceed the original cash advance amount.' }
  }

  if (!data.confirmed) {
    return { success: false, error: 'Please confirm the liquidation details before continuing.' }
  }

  try {
    await db.$transaction(async (tx) => {
      const liquidation = await tx.liquidationRecord.create({
        data: {
          cashAdvanceId: data.cashAdvanceId,
          totalLiquidated: new Prisma.Decimal(totalLiquidated.toFixed(2)),
          unliquidatedBalance: new Prisma.Decimal((toMoney(cashAdvance.amount) - totalLiquidated).toFixed(2)),
          submittedByOfficerId: officer.id,
          liquidationExpenses: {
            create: uniqueExpenseIds.map((expenseId) => ({ expenseId })),
          },
        },
      })

      await tx.cashAdvance.update({
        where: { id: data.cashAdvanceId },
        data: { status: 'LIQUIDATED' },
      })

      await tx.auditLog.create({
        data: {
          officerId: officer.id,
          action: 'LIQUIDATION_CREATED',
          targetRecord: 'LiquidationRecord',
          recordId: liquidation.id,
          previousVal: JSON.stringify({ status: cashAdvance.status }),
          newVal: JSON.stringify({ totalLiquidated: totalLiquidated.toFixed(2), status: 'LIQUIDATED' }),
          timestamp: new Date(),
        },
      })
    })

    revalidatePath('/finance/liquidation')
    revalidatePath('/finance/cash-advances')
    return { success: true }
  } catch (error) {
    console.error('createLiquidationRecordAction error:', error)
    return { success: false, error: 'Unable to create liquidation record.' }
  }
}

export async function getLiquidationRecordsAction(): Promise<LiquidationRecordSummary[]> {
  const records = await db.liquidationRecord.findMany({
    include: {
      cashAdvance: {
        include: {
          expenses: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  })

  return records.map((record) => ({
    id: record.id,
    cashAdvanceId: record.cashAdvanceId,
    purpose: record.cashAdvance.purpose,
    recipientName: record.cashAdvance.recipientName,
    totalAdvanced: toMoney(record.cashAdvance.amount),
    totalLiquidated: toMoney(record.totalLiquidated),
    unliquidatedBalance: toMoney(record.unliquidatedBalance),
    submittedAt: record.submittedAt.toISOString(),
  }))
}
