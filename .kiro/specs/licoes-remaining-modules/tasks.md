# Implementation Plan: LICOES Remaining Modules

## Overview

This plan implements the 7 remaining modules of the LICOES Officer Management System:
1. **Admin Configuration Panel** — database-driven dropdowns replacing all hardcoded values
2. **Finance Expense Recorder** — cash advances, itemized expenses, evidence uploads, and acknowledgment receipts
3. **Liquidation Records** — reconcile cash advances against supported expenses
4. **Scan Profile Summary** — post-scan modal showing attendance history and payment status
5. **Reporting & Export** — filterable attendance and payment reports with CSV/PDF export
6. **Audit Log UI** — chronological read-only view of all sensitive system actions
7. **Data Migration** — bulk CSV import of historical Google Form/Sheets payment records

## Tasks

- [x] 1. Extend Prisma schema with new models and run migration
  - Add `ConfigItemType` enum (`PROGRAM`, `YEAR_LEVEL`, `SHIRT_SIZE`, `PAYMENT_METHOD`) to `prisma/schema.prisma`
  - Add `CashAdvanceStatus` enum (`OPEN`, `LIQUIDATED`) to `prisma/schema.prisma`
  - Add `SystemConfig` model with fields `id`, `type`, `value`, `isActive`, `createdAt` and `@@unique([type, value])` constraint
  - Add `CashAdvance` model with fields `id`, `recipientName`, `purpose`, `amount` (Decimal 15,2), `dateIssued`, `status`, `createdByOfficerId`, `createdAt`, `updatedAt`; add `cashAdvances CashAdvance[]` back-relation to `Officer`
  - Add `Expense` model with fields `id`, `cashAdvanceId`, `description`, `vendorName`, `amount` (Decimal 15,2), `datePurchased`, `acknowledgmentReceiptNumber` (String? @unique), snapshot fields `arVendorName`, `arDescription`, `arAmount`, `arIssuedAt`, `createdAt`
  - Add `ExpenseEvidence` model with fields `id`, `expenseId`, `fileUrl`, `fileName`, `uploadedAt`; set `onDelete: Cascade` on the `expense` relation
  - Add `LiquidationRecord` model with fields `id`, `cashAdvanceId` (@unique), `totalLiquidated` (Decimal 15,2), `unliquidatedBalance` (Decimal 15,2), `submittedByOfficerId`, `submittedAt`; add `liquidationRecords LiquidationRecord[]` back-relation to `Officer`
  - Add `LiquidationExpense` join model with fields `id`, `liquidationRecordId`, `expenseId` (@unique)
  - Run `npx prisma migrate dev --name add-remaining-modules` and verify no existing columns are dropped
  - Run `npx prisma generate` to regenerate the Prisma client
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [x] 2. Update middleware to protect new routes
  - Modify `src/middleware.ts` — add route guard for `/finance/:path*` allowing only `FINANCE_OFFICER` or `ADMIN` roles, redirecting others to `/unauthorized`
  - Add route guard for `/reports/attendance` allowing only `ADMIN` or `FINANCE_OFFICER` roles
  - Add route guard for `/reports/payments` allowing only `ADMIN` or `TREASURER` roles
  - Add route guard for `/auditor/:path*` allowing only `AUDITOR` or `ADMIN` roles; AUDITOR role accessing any non-`/auditor` route should fall through to the existing `/admin` guard which will redirect them
  - Extend the `matcher` array in `export const config` to include `'/finance/:path*'`, `'/reports/:path*'`, and `'/auditor/:path*'`
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 3. Admin Configuration Panel — server actions
  - Create `src/app/actions/config-actions.ts`
  - Implement `getConfigItemsAction(type: ConfigItemType): Promise<ConfigItem[]>` — queries `db.systemConfig.findMany` filtered by `type` and `isActive: true`
  - Implement `addConfigItemAction(type: ConfigItemType, value: string): Promise<ActionResult>` — validates non-blank input, enforces per-type length limits (PROGRAM ≤ 20, SHIRT_SIZE ≤ 10, PAYMENT_METHOD ≤ 50, YEAR_LEVEL ≤ 20), rejects case-insensitive duplicates among active items of the same type, then calls `db.systemConfig.create`, and calls `revalidatePath('/admin/config')`
  - Implement `toggleConfigItemAction(id: string): Promise<ActionResult>` — flips `isActive` on the record, calls `revalidatePath('/admin/config')`
  - Implement `deleteConfigItemAction(id: string): Promise<ActionResult>` — checks for references in `StudentProfile.program`, `PaymentClaim.program`, `PaymentClaim.paymentMethod`, `PaymentClaim.shirtSize`, and `Student.course` before deleting; returns `{ success: false, error: 'record is in use' }` if any reference found
  - Export the `ActionResult` type: `type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string }`
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Admin Configuration Panel — page and UI components
  - Create `src/components/admin/ConfigSection.tsx` as a `'use client'` component accepting props `type: ConfigItemType`, `items: ConfigItem[]`; renders an add form (text input + submit button), an active item list with toggle and delete buttons per row, and calls the corresponding server actions on each interaction
  - Create `src/app/admin/config/page.tsx` as a Server Component; calls `getConfigItemsAction` for each of the four types in parallel, renders four `<ConfigSection>` components with their data
  - Modify `src/app/admin/layout.tsx` — add a "Configuration" nav item pointing to `/admin/config` in the `navItems` array
  - _Requirements: 1.1, 2.1, 2.7_

- [x] 5. Finance module layout and navigation
  - Create `src/app/finance/layout.tsx` as a `'use client'` component — mirrors the pattern of `src/app/admin/layout.tsx`; sidebar nav items: Cash Advances (`/finance/cash-advances`), Expenses (`/finance/expenses`), Liquidation (`/finance/liquidation`); header badge reads "Finance"
  - _Requirements: 3.3_

- [-] 6. Finance — Cash Advance server actions
  - Create `src/app/actions/finance-actions.ts`
  - Implement `createCashAdvanceAction(data: CreateCashAdvanceInput): Promise<ActionResult>` — validates `recipientName` non-empty ≤ 100 chars, `purpose` non-empty ≤ 255 chars, `amount` positive decimal, `dateIssued` not in the future; creates `CashAdvance` with `status: 'OPEN'` and writes an `AuditLog` entry with `action: 'CASH_ADVANCE_CREATED'`; calls `revalidatePath('/finance/cash-advances')`
  - Implement `getCashAdvancesAction(): Promise<CashAdvance[]>` — returns all cash advances ordered by `dateIssued` descending, including `expenses` count
  - Export `CreateCashAdvanceInput` type: `{ recipientName: string; purpose: string; amount: number; dateIssued: string }`
  - _Requirements: 3.1, 3.2, 3.3, 3.7_

- [~] 7. Finance — Cash Advance pages
  - Create `src/app/finance/cash-advances/page.tsx` as a Server Component — calls `getCashAdvancesAction`, renders a list table (recipient, purpose, amount, dateIssued, status badge) plus an inline `CreateCashAdvanceForm` client component for adding new advances
  - Create `src/components/finance/CreateCashAdvanceForm.tsx` as a `'use client'` component — form with fields for recipient name, purpose, amount, date issued; calls `createCashAdvanceAction` on submit and shows inline success/error feedback
  - Create `src/app/finance/cash-advances/[id]/page.tsx` as a Server Component — shows cash advance detail and calls `getExpensesByCashAdvanceAction(id)` to list its expenses; renders an `AddExpenseForm` when advance status is `OPEN`
  - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [~] 8. Finance — Expense server actions
  - In `src/app/actions/finance-actions.ts`, add:
  - `createExpenseAction(data: CreateExpenseInput): Promise<ActionResult>` — validates description ≤ 255 chars, vendorName ≤ 100 chars, amount 0.01–999999999.99, `datePurchased` not in the future; rejects if the referenced `CashAdvance.status` is not `OPEN`; creates `Expense` record and writes an `AuditLog` entry with `action: 'EXPENSE_CREATED'`; calls `revalidatePath('/finance/cash-advances/[id]')`
  - `getExpensesByCashAdvanceAction(cashAdvanceId: string): Promise<Expense[]>` — returns expenses with their `evidence` relation included, ordered by `createdAt` descending
  - Export `CreateExpenseInput` type: `{ cashAdvanceId: string; description: string; vendorName: string; amount: number; datePurchased: string }`
  - _Requirements: 4.1, 4.2, 4.7, 4.8_

- [~] 9. Finance — Uploadthing evidence upload endpoint
  - Modify `src/app/api/uploadthing/core.ts` — add an `expenseEvidence` file route accepting `image` (max 10 MB) and `pdf` (max 10 MB) types; the `.middleware()` call must verify the session has `FINANCE_OFFICER` or `ADMIN` role; the `.onUploadComplete()` callback calls `db.expenseEvidence.create` with `expenseId` from metadata, `fileUrl: file.ufsUrl`, and `fileName: file.name`
  - Create `src/components/finance/EvidenceUploader.tsx` as a `'use client'` component using the Uploadthing React hook; renders a dropzone for up to 10 files; displays uploaded file list with remove links; shows inline error when the 10-file limit is reached or a file is rejected by type/size
  - _Requirements: 4.3, 4.4, 4.5_

- [~] 10. Finance — Expense list page with evidence display
  - Create `src/app/finance/expenses/page.tsx` as a Server Component — lists all expenses across all cash advances; each row shows description, vendor, amount, date, and AR number if generated
  - Create `src/app/finance/expenses/[expenseId]/page.tsx` as a Server Component — shows full expense detail including all `ExpenseEvidence` records as download links; renders a "Generate AR" button if `acknowledgmentReceiptNumber` is null
  - _Requirements: 4.6_

- [~] 11. Finance — Acknowledgment Receipt server action
  - In `src/app/actions/finance-actions.ts`, add:
  - `generateAcknowledgmentReceiptAction(expenseId: string): Promise<ActionResult & { receiptNumber?: string }>` — runs inside `prisma.$transaction`; finds the most recent `acknowledgmentReceiptNumber` for the current calendar year; computes next sequential number as `AR-{year}-{seq padded to 4 digits}`; updates the `Expense` record with the receipt number and all `ar*` snapshot fields; writes an `AuditLog` entry with `action: 'AR_GENERATED'`
  - `getAcknowledgmentReceiptAction(expenseId: string): Promise<AcknowledgmentReceiptData | null>` — returns the persisted snapshot fields from the `Expense` record
  - Export `AcknowledgmentReceiptData` type with fields: `receiptNumber`, `arVendorName`, `arDescription`, `arAmount`, `arIssuedAt`, `officerName`
  - _Requirements: 5.1, 5.3, 5.4, 5.6_

- [~] 12. Finance — Acknowledgment Receipt print page
  - Create `src/app/finance/expenses/[expenseId]/acknowledgment-receipt/layout.tsx` — exports a minimal passthrough layout to opt out of the Finance sidebar
  - Create `src/app/finance/expenses/[expenseId]/acknowledgment-receipt/page.tsx` as a Server Component — calls `getAcknowledgmentReceiptAction(expenseId)`; renders receipt fields; includes `@media print` CSS rules that hide navigation; includes a `window.print()` trigger button visible only on screen
  - _Requirements: 5.1, 5.2, 5.4_

- [~] 13. Liquidation Records — server actions
  - In `src/app/actions/finance-actions.ts`, add:
  - `createLiquidationRecordAction(data: CreateLiquidationInput): Promise<ActionResult>` — validates CashAdvance is OPEN, at least one expense, all expenses belong to the advance, no expense already in another LiquidationRecord; runs `prisma.$transaction` to create `LiquidationRecord`, `LiquidationExpense` rows, and update `CashAdvance.status` to `LIQUIDATED`; writes `AuditLog` entry
  - `getLiquidationRecordsAction(): Promise<LiquidationRecord[]>` — returns all records with related `cashAdvance` data
  - Export `CreateLiquidationInput` type: `{ cashAdvanceId: string; expenseIds: string[]; totalLiquidated: number; confirmed?: boolean }`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

- [~] 14. Liquidation Records — page
  - Create `src/app/finance/liquidation/page.tsx` as a Server Component — calls `getLiquidationRecordsAction`, renders table with columns: purpose, total advanced, total liquidated, unliquidated balance, submitted date
  - Create `src/components/finance/CreateLiquidationForm.tsx` as a `'use client'` component — allows selecting a cash advance and checking expense checkboxes; displays running total; calls `createLiquidationRecordAction`; shows confirmation prompt on over-advance warning
  - _Requirements: 6.6_

- [~] 15. Scan Profile Summary — server action
  - Modify `src/app/actions/attendance-actions.ts` — add `getScanProfileSummaryAction(studentProfileId: string): Promise<ScanProfileSummaryData>`
  - Query last 10 `AttendanceSession` records joined via `AttendanceRecord` and `Event`, ordered by `timeIn DESC`
  - Query active `CollectionPeriod` and the student's `PaymentClaim` + `EReceipt` for that period
  - Export `ScanProfileSummaryData`, `SessionRow` types
  - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5_

- [~] 16. Scan Profile Summary — modal component
  - Create `src/components/attendance/ScanProfileSummaryModal.tsx` as a `'use client'` component
  - Always show identity fields immediately from `studentProfile` prop
  - Show skeleton loader while `isLoading`; show attendance session table or "No previous attendance records found." when loaded
  - Show payment status badge (green APPROVED + receipt number, amber PENDING + date, red UNPAID + link); omit if `paymentStatus` is null
  - Show error message in history/payment section if `isError`, without hiding identity fields
  - _Requirements: 7.2, 7.3, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5_

- [~] 17. Scan Profile Summary — integrate into attendance page
  - Modify `src/app/attendance/page.tsx` — call `getScanProfileSummaryAction` in a `useTransition` after each successful scan
  - Set 10-second timeout using AbortController; set `summaryError: true` on timeout
  - Render `<ScanProfileSummaryModal>` conditionally; replace on each new scan; clear on dismiss
  - _Requirements: 7.1, 7.3, 7.4, 7.7_

- [~] 18. Reporting — shared layout
  - Create `src/app/reports/layout.tsx` as a `'use client'` component — sidebar nav with Attendance Report and Payments Report items; render conditionally based on session roles
  - _Requirements: 9.1, 10.1_

- [~] 19. Reporting — Attendance Report server actions
  - Create `src/app/actions/report-actions.ts`
  - Implement `getAttendanceReportAction(filters: AttendanceFilters): Promise<AttendanceRow[]>` — queries `AttendanceSession` joined through `AttendanceRecord` → `StudentProfile` and `Event`; supports filtering by `eventId`, `program`, `status` with AND logic
  - Export `AttendanceFilters` and `AttendanceRow` types
  - _Requirements: 9.3, 9.4, 9.5_

- [~] 20. Reporting — Attendance Report page and CSV/PDF export
  - Create `src/app/reports/attendance/page.tsx` as a Server Component — reads `searchParams`; calls `getAttendanceReportAction` when event selected; shows placeholder when no event; shows empty state when no records
  - Create `src/components/reports/AttendanceFilterBar.tsx` as a `'use client'` component
  - Create `src/app/api/reports/attendance/export/route.ts` — GET handler returning CSV with exact column headers
  - Create `src/app/api/reports/attendance/pdf/route.ts` — GET handler returning print-optimized HTML
  - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7, 9.8, 9.9_

- [~] 21. Reporting — Payment Report server actions
  - In `src/app/actions/report-actions.ts`, add:
  - `getPaymentReportAction(filters: PaymentFilters): Promise<PaymentRow[]>` and `getPaymentReportSummaryAction`
  - Export `PaymentFilters` and `PaymentRow` types
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [~] 22. Reporting — Payment Report page and CSV/PDF export
  - Create `src/app/reports/payments/page.tsx` as a Server Component
  - Create `src/components/reports/PaymentFilterBar.tsx` as a `'use client'` component
  - Create `src/app/api/reports/payments/export/route.ts` — GET handler returning CSV
  - Create `src/app/api/reports/payments/pdf/route.ts` — GET handler returning print-ready HTML
  - _Requirements: 10.1, 10.2, 10.6, 10.7, 10.8_

- [~] 23. Audit Log UI — server action
  - Create `src/app/actions/audit-actions.ts`
  - Implement `getAuditLogsAction(filters: AuditFilters): Promise<{ logs: AuditLog[], total: number }>` with pagination (50/page), multi-field filtering, and `officer` relation included
  - Export `AuditFilters` type
  - _Requirements: 11.2, 11.4, 11.5, 11.6, 11.7_

- [~] 24. Audit Log UI — layout and page
  - Create `src/app/auditor/layout.tsx` as a `'use client'` component — read-only sidebar, no create/edit controls
  - Create `src/app/auditor/logs/page.tsx` as a Server Component — reads `searchParams`; renders table, pagination, and empty state
  - Create `src/components/auditor/AuditLogFilterBar.tsx` as a `'use client'` component
  - Create `src/components/auditor/AuditLogRow.tsx` as a `'use client'` component — expandable row showing previousVal/newVal as formatted JSON; displays "—" for null fields
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6, 11.7, 11.8, 11.9_

- [~] 25. Data Migration — server actions
  - Create `src/app/actions/migration-actions.ts`
  - Implement `downloadMigrationTemplateAction(): string` returning CSV header string
  - Implement `importPaymentRecordsAction(formData: FormData): Promise<MigrationResult>` — rejects >5 MB; parses CSV; validates 9 headers; processes rows one-by-one skipping missing fields and duplicates; creates `PaymentClaim` + `EReceipt` per row in transaction; writes single `AuditLog` entry after all rows
  - Export `MigrationResult` type
  - _Requirements: 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9_

- [~] 26. Data Migration — page
  - Create `src/app/admin/migration/page.tsx` as a Server Component — template download section + ImportCsvForm
  - Create `src/components/admin/ImportCsvForm.tsx` as a `'use client'` component — CSV file input, loading state, MigrationResult summary display
  - Modify `src/app/admin/layout.tsx` — add "Data Migration" nav item
  - _Requirements: 12.1, 12.2, 12.7, 12.9_

- [~] 27. Connect submit-claim form dropdowns to SystemConfig
  - Split `src/app/submit-claim/page.tsx` into a Server Component wrapper and a new `src/components/submit-claim/SubmitClaimForm.tsx` client component
  - Server Component calls `getConfigItemsAction` for PROGRAM, YEAR_LEVEL, SHIRT_SIZE, PAYMENT_METHOD in parallel and passes results as props
  - Client component renders dropdowns from props instead of hardcoded arrays
  - _Requirements: 2.8_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2, 3, 5, 15, 18, 23, 25] },
    { "wave": 3, "tasks": [4, 6, 8, 16, 19, 21, 24, 26] },
    { "wave": 4, "tasks": [7, 9, 11, 13, 17, 20, 22, 27] },
    { "wave": 5, "tasks": [10, 12, 14] }
  ],
  "dependencies": {
    "2":  ["1"],
    "3":  ["1"],
    "4":  ["3"],
    "5":  ["1"],
    "6":  ["5", "1"],
    "7":  ["6"],
    "8":  ["6", "1"],
    "9":  ["8"],
    "10": ["8", "9"],
    "11": ["10"],
    "12": ["11"],
    "13": ["8", "10", "1"],
    "14": ["13"],
    "15": ["1"],
    "16": ["15"],
    "17": ["16"],
    "18": ["1"],
    "19": ["18", "1"],
    "20": ["19"],
    "21": ["18", "1"],
    "22": ["21"],
    "23": ["1"],
    "24": ["23"],
    "25": ["1"],
    "26": ["25"],
    "27": ["4"]
  }
}
```

Tasks 7, 9, 10, 12, 14, 15, 17, 18, 20, 22, 24, 26 each require Task 1 (schema) to complete first.
Tasks 9, 10 depend on Task 8. Tasks 11, 12 depend on Task 10. Tasks 13, 14 depend on Tasks 8–10.
Tasks 16, 17 depend on Task 15. Tasks 20, 22 depend on Tasks 19, 21 respectively.

## Notes

- The Prisma migration in Task 1 must succeed before any other task can be executed — all new models are referenced throughout.
- The `@/ alias` should resolve to `src/` per the existing `tsconfig.json` paths configuration.
- All new server actions follow the existing `ActionResult` pattern from the codebase.
- The Finance Officer Uploadthing middleware in Task 9 must be updated if the existing `core.ts` uses a different auth pattern.
- PDF export in Tasks 20 and 22 uses browser print-to-PDF (no server-side headless browser) — the "Export PDF" button opens the route in a new tab.
- The `xlsx` package is already in `package.json` (used by alpha list upload) and can be reused for CSV parsing in Task 25.
- Admin layout modifications in Tasks 4 and 26 should check whether `src/app/admin/layout.tsx` exists; if it does not yet exist, create it following the same sidebar pattern as the treasurer layout.

