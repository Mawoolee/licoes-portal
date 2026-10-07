# Design Document — LICOES Remaining Modules

## Overview

This document covers the technical design for the seven remaining modules of the LICOES Officer Management System: Admin Configuration Panel, Finance Expense Recorder, Liquidation Records, Scan Profile Summary, Reporting & Export, Audit Log UI, and Data Migration. It also covers the schema extensions and middleware updates that underpin all of them.

The system runs on **Next.js 16 (App Router)**, **Prisma 5 / Neon PostgreSQL**, **NextAuth.js v4 with JWT**, **Tailwind CSS + Shadcn UI**, **Uploadthing** for file storage, and **Resend** for email. All new modules follow the same patterns already established in the codebase:

- Data mutations are **Server Actions** in `src/app/actions/`.
- Role authorization uses the existing `requireOfficerRole()` helper from `src/lib/session.ts`.
- The Prisma client singleton is exported as `db` from `src/lib/db.ts` and as `prisma` from `src/lib/prisma.ts` (both point to the same singleton; new code will use `db` for consistency).
- Pages under `/admin` use the existing `AdminLayout` with a sidebar nav; new sections add nav entries to that sidebar.
- The middleware at `src/middleware.ts` is extended — not replaced — to protect new route groups.

---

## Architecture

### Request Flow

```mermaid
flowchart TD
    Browser --> MW[src/middleware.ts\nwithAuth + role checks]
    MW -->|authorized| Page[Server Component\n/app/…/page.tsx]
    MW -->|unauthorized| Unauth[/unauthorized]
    Page --> SA[Server Action\n/app/actions/…]
    SA --> DB[(Neon PostgreSQL\nvia Prisma)]
    SA --> UT[Uploadthing\nfile storage]
    SA --> Resend[Resend\nemail — unused by new modules]
    Page --> CC[Client Component\n'use client']
    CC --> SA
```

### New Route Groups and Layouts

```
src/app/
├── admin/
│   ├── layout.tsx          (existing — nav entries added)
│   ├── config/             NEW — Admin Config Panel
│   │   └── page.tsx
│   └── migration/          NEW — Data Migration
│       └── page.tsx
├── finance/                NEW layout — FINANCE_OFFICER | ADMIN
│   ├── layout.tsx
│   ├── cash-advances/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── expenses/
│       ├── page.tsx
│       └── [expenseId]/
│           ├── page.tsx
│           └── acknowledgment-receipt/
│               └── page.tsx
├── reports/                NEW layout — role-gated per sub-route
│   ├── layout.tsx
│   ├── attendance/
│   │   └── page.tsx
│   └── payments/
│       └── page.tsx
└── auditor/                NEW layout — AUDITOR | ADMIN
    ├── layout.tsx
    └── logs/
        └── page.tsx
```

The attendance page (`src/app/attendance/page.tsx`) is modified in place to render the Scan Profile Summary modal.

---

## Components and Interfaces

### Module 1 — Admin Configuration Panel

**Pages**

| File | Description |
|------|-------------|
| `src/app/admin/config/page.tsx` | Server component — renders four `ConfigSection` client components (one per type) |

**Shared Client Component**

`src/components/admin/ConfigSection.tsx` — accepts `type: ConfigItemType`, `items: ConfigItem[]`, renders add-form + active list + toggle/delete actions via Server Actions.

**Server Actions** — `src/app/actions/config-actions.ts`

```typescript
getConfigItemsAction(type: ConfigItemType): Promise<ConfigItem[]>
addConfigItemAction(type: ConfigItemType, value: string): Promise<ActionResult>
toggleConfigItemAction(id: string): Promise<ActionResult>
deleteConfigItemAction(id: string): Promise<ActionResult>
```

`addConfigItemAction` validates length per type (PROGRAM ≤ 20, SHIRT_SIZE ≤ 10, PAYMENT_METHOD ≤ 50, YEAR_LEVEL ≤ 20), rejects blank input, and rejects case-insensitive duplicates among active items of the same type. It uses `revalidatePath('/admin/config')` so the page re-fetches without a client-side reload.

`deleteConfigItemAction` checks for references in `StudentProfile.program`, `PaymentClaim.program`, `PaymentClaim.paymentMethod`, `PaymentClaim.shirtSize`, and `Student.course` before deleting. If any reference exists, it returns `{ success: false, error: 'record is in use' }`.

**Dropdown Integration**

The Submit Claim page (`/submit-claim`) and any officer-facing form that previously used hardcoded option arrays will call `getConfigItemsAction` at the top of its Server Component to populate the select lists. Active-only items are filtered server-side with `where: { isActive: true }`.

---

### Module 2 — Finance Expense Recorder

**Layouts & Pages**

| File | Description |
|------|-------------|
| `src/app/finance/layout.tsx` | Shared sidebar layout for all finance routes |
| `src/app/finance/cash-advances/page.tsx` | List + create cash advances |
| `src/app/finance/cash-advances/[id]/page.tsx` | Detail view: expenses under a cash advance |
| `src/app/finance/expenses/[expenseId]/acknowledgment-receipt/page.tsx` | Print-ready AR page |

**Server Actions** — `src/app/actions/finance-actions.ts`

```typescript
// Cash Advances
createCashAdvanceAction(data: CreateCashAdvanceInput): Promise<ActionResult>
getCashAdvancesAction(): Promise<CashAdvance[]>

// Expenses
createExpenseAction(data: CreateExpenseInput): Promise<ActionResult>
getExpensesByCashAdvanceAction(cashAdvanceId: string): Promise<Expense[]>

// Acknowledgment Receipt
generateAcknowledgmentReceiptAction(expenseId: string): Promise<ActionResult & { receiptNumber?: string }>
getAcknowledgmentReceiptAction(expenseId: string): Promise<AcknowledgmentReceiptData | null>
```

**Receipt Number Sequencing**

`generateAcknowledgmentReceiptAction` runs inside a `prisma.$transaction` to prevent race conditions:

```typescript
// Within transaction
const year = new Date().getFullYear()
const lastAR = await tx.expense.findFirst({
  where: {
    acknowledgmentReceiptNumber: { startsWith: `AR-${year}-` },
  },
  orderBy: { acknowledgmentReceiptNumber: 'desc' },
})
const seq = lastAR
  ? parseInt(lastAR.acknowledgmentReceiptNumber!.split('-')[2]) + 1
  : 1
const receiptNumber = `AR-${year}-${String(seq).padStart(4, '0')}`
```

The receipt page at `/finance/expenses/[expenseId]/acknowledgment-receipt` is a server component that reads a persisted `AcknowledgmentReceiptSnapshot` (see Data Models below). It uses a `@media print` stylesheet via a `<style>` tag inside the page to hide navigation. The layout for this single page must **not** render the Finance sidebar; a dedicated `layout.tsx` segment at the `acknowledgment-receipt` level uses `export default function Layout({ children }) { return children }` to opt out of the parent layout shell.

**File Upload (Uploadthing)**

Evidence files attach to individual `Expense` records. The existing Uploadthing setup is reused. A new file router endpoint `expenseEvidence` is added to `src/app/api/uploadthing/core.ts`:

```typescript
expenseEvidence: f({ image: { maxFileSize: '10MB' }, pdf: { maxFileSize: '10MB' } })
  .middleware(requireFinanceOfficer)
  .onUploadComplete(async ({ metadata, file }) => {
    await db.expenseEvidence.create({
      data: {
        expenseId: metadata.expenseId,
        fileUrl: file.ufsUrl,
        fileName: file.name,
      },
    })
  })
```

The `maxFileSize: '10MB'` enforces the 10 MB per-file requirement. The JPEG/PNG/PDF type constraint is enforced by Uploadthing's `image` + `pdf` categories, which reject other MIME types before upload completes.

---

### Module 3 — Liquidation Records

**Pages**

| File | Description |
|------|-------------|
| `src/app/finance/liquidation/page.tsx` | List all liquidation records + create form |

**Server Actions** — within `src/app/actions/finance-actions.ts`

```typescript
createLiquidationRecordAction(data: CreateLiquidationInput): Promise<ActionResult>
getLiquidationRecordsAction(): Promise<LiquidationRecord[]>
```

`createLiquidationRecordAction` validates:
1. `CashAdvance.status === 'OPEN'`
2. At least one `expenseId` provided
3. All expenses belong to the target `CashAdvance`
4. No expense is already in another `LiquidationRecord`
5. `totalLiquidated === sum(expense.amounts)`
6. If `totalLiquidated > cashAdvance.amount`, returns a warning requiring client confirmation (a boolean `confirmed` flag in the input activates the bypass)

After a successful liquidation, the action updates `CashAdvance.status` to `LIQUIDATED` within the same transaction.

---

### Module 4 — Scan Profile Summary

**Changes to existing file:** `src/app/attendance/page.tsx`

The scan result returned by `recordScanAction` is extended to include `profileSummary` data. The `ScanProfileSummaryModal` client component is rendered conditionally after a successful scan.

**New Server Action** — `src/app/actions/attendance-actions.ts` (added function)

```typescript
export async function getScanProfileSummaryAction(studentProfileId: string): Promise<ScanProfileSummaryData>
```

This action queries:
1. `StudentProfile` for identity fields (name, studentNumber, program, yearLevel)
2. `AttendanceRecord + AttendanceSession` — last 10 sessions across all events, ordered by `timeIn DESC`, joining `Event` for name/date
3. Active `CollectionPeriod` — `start ≤ now ≤ end` — and the student's `PaymentClaim` for that period

The attendance terminal calls `getScanProfileSummaryAction` immediately after `recordScanAction` succeeds, using `useTransition` for the second call so the modal appears immediately with identity data, then populates history asynchronously.

**`ScanProfileSummaryModal` Component** — `src/components/attendance/ScanProfileSummaryModal.tsx`

```typescript
interface Props {
  studentProfile: StudentProfile | null
  summaryData: ScanProfileSummaryData | null
  isLoading: boolean
  isError: boolean
  onDismiss: () => void
}
```

Renders as an overlay on top of the scanner terminal. The modal stays open until dismissed or replaced by a new scan. Identity fields (name, number, program, year level) render immediately from `studentProfile`; the attendance history and payment status sections show a skeleton loader while `isLoading` is true. If the load fails after 10 seconds (via `setTimeout` + `AbortController`), the history section shows an error state while identity fields remain.

Payment status badge logic:

```
APPROVED  → green badge + EReceipt.receiptNumber
PENDING   → amber badge + PaymentClaim.createdAt formatted date
UNPAID    → red badge + link to /submit-claim
no active period → omit section entirely
```

---

### Module 5 — Reporting & Export

**Layouts & Pages**

| File | Description |
|------|-------------|
| `src/app/reports/layout.tsx` | Sidebar layout (role-appropriate nav items rendered conditionally) |
| `src/app/reports/attendance/page.tsx` | Attendance report — ADMIN / FINANCE_OFFICER |
| `src/app/reports/payments/page.tsx` | Payment report — ADMIN / TREASURER |

Both pages are **Server Components** that receive filter state via URL search params. This keeps filtering server-side, avoids large client-side datasets, and makes filtered URLs shareable.

**Server Actions** — `src/app/actions/report-actions.ts`

```typescript
getAttendanceReportAction(filters: AttendanceFilters): Promise<AttendanceRow[]>
getPaymentReportAction(filters: PaymentFilters): Promise<PaymentRow[]>
getPaymentReportSummaryAction(collectionPeriodId: string, filters: PaymentFilters): Promise<PaymentSummary>
```

**CSV Export** — Route Handlers (not Server Actions, because they need to stream file downloads)

```
src/app/api/reports/attendance/export/route.ts   → GET → CSV
src/app/api/reports/payments/export/route.ts     → GET → CSV
```

These route handlers re-run the same DB query as the page Server Action (filters passed as query params), build the CSV string in-memory, and return it with:

```typescript
return new Response(csvString, {
  headers: {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="attendance-report-${eventId}.csv"`,
  },
})
```

**PDF Export** — Route Handlers using the browser print API

```
src/app/api/reports/attendance/pdf/route.ts   → GET → HTML (print-optimized)
src/app/api/reports/payments/pdf/route.ts     → GET → HTML
```

The PDF route returns a fully self-contained HTML page with a `<style>@media screen { ... display:none }</style>` pattern and a `<script>window.onload = () => window.print()</script>` so opening the URL triggers browser print-to-PDF immediately. This avoids a server-side headless browser dependency. The "Export PDF" button opens the PDF route in a new tab.

Column headers match the requirements exactly:
- Attendance CSV: `Student Number`, `Full Name`, `Program`, `Year Level`, `Time In`, `Time Out`, `Status`
- Payments CSV: `Student Number`, `Full Name`, `Program`, `Year Level`, `Payment Method`, `Reference No`, `Amount`, `Submitted At`, `Status`, `Receipt No`

**Filter Client Components** — `src/components/reports/AttendanceFilterBar.tsx`, `PaymentFilterBar.tsx`

These are small `'use client'` components that update URL search params via `router.push` on form submit, triggering a Server Component re-render with the new filters. No client-side data fetching needed.

---

### Module 6 — Audit Log UI

**Pages**

| File | Description |
|------|-------------|
| `src/app/auditor/layout.tsx` | Auditor layout with read-only nav |
| `src/app/auditor/logs/page.tsx` | Paginated, filterable audit log table |

Filtering and pagination are URL-search-param driven (same pattern as reports). The page accepts `?officer=`, `?action=`, `?target=`, `?from=`, `?to=`, `?page=` params.

**Server Actions** — `src/app/actions/audit-actions.ts`

```typescript
getAuditLogsAction(filters: AuditFilters): Promise<{ logs: AuditLog[], total: number }>
```

Query:

```typescript
const where: Prisma.AuditLogWhereInput = {
  ...(filters.officer && {
    officer: { name: { contains: filters.officer, mode: 'insensitive' } }
  }),
  ...(filters.action && { action: { contains: filters.action, mode: 'insensitive' } }),
  ...(filters.target && { targetRecord: { equals: filters.target } }),
  ...(filters.from || filters.to
    ? {
        timestamp: {
          ...(filters.from && { gte: new Date(filters.from) }),
          ...(filters.to && { lte: new Date(filters.to) }),
        },
      }
    : {}),
}
const [logs, total] = await Promise.all([
  db.auditLog.findMany({
    where,
    include: { officer: { select: { name: true } } },
    orderBy: { timestamp: 'desc' },
    skip: (page - 1) * 50,
    take: 50,
  }),
  db.auditLog.count({ where }),
])
```

The row-expand interaction is a client-side `useState` toggle — no additional server round-trips. `previousVal` / `newVal` JSON is formatted with `JSON.stringify(JSON.parse(val), null, 2)` inside a `<pre>` tag.

---

### Module 7 — Data Migration

**Pages**

| File | Description |
|------|-------------|
| `src/app/admin/migration/page.tsx` | Template download + CSV upload UI |

**Server Actions** — `src/app/actions/migration-actions.ts`

```typescript
downloadMigrationTemplateAction(): string  // returns CSV template as string (client triggers download)
importPaymentRecordsAction(formData: FormData): Promise<MigrationResult>
```

`importPaymentRecordsAction` processes the uploaded CSV in a streaming fashion row-by-row using the `xlsx` package already in the dependency list (which also handles CSV). Processing logic:

```
for each row:
  1. Validate all 9 required fields present → skip row + record error if not
  2. Normalize reference_number (trim, uppercase) for duplicate check
  3. If reference_number exists in PaymentClaim for same collection period → skip as duplicate
  4. Find or create CollectionPeriod by name (inactive if created new)
  5. Find or create StudentProfile by student_number
  6. prisma.$transaction:
       a. Create PaymentClaim with status=APPROVED
       b. Create EReceipt with auto-generated receipt number (no email sent)
  7. On unexpected error → record as "failed", continue
```

The file size limit (5 MB) is checked before parsing via `file.size > 5 * 1024 * 1024`. The action returns a `MigrationResult`:

```typescript
interface MigrationResult {
  success: boolean
  totalRows: number
  imported: number
  skipped: { row: number; reason: string }[]
  failed: { row: number; reason: string }[]
}
```

An `AuditLog` entry with `action: 'BULK_PAYMENT_IMPORT'` is written after all rows complete, recording counts in `newVal` as JSON.

---

### Module 8 — Middleware & Route Protection

`src/middleware.ts` is updated to add the new route guards. The matcher array is extended, and new `if` blocks are added inside the middleware function:

```typescript
// Finance routes — FINANCE_OFFICER or ADMIN
if (
  path.startsWith('/finance') &&
  !roles.includes('FINANCE_OFFICER') &&
  !roles.includes('ADMIN')
) {
  return NextResponse.redirect(new URL('/unauthorized', req.url))
}

// Reports/attendance — ADMIN or FINANCE_OFFICER
if (
  path === '/reports/attendance' &&
  !roles.includes('ADMIN') &&
  !roles.includes('FINANCE_OFFICER')
) {
  return NextResponse.redirect(new URL('/unauthorized', req.url))
}

// Reports/payments — ADMIN or TREASURER
if (
  path === '/reports/payments' &&
  !roles.includes('ADMIN') &&
  !roles.includes('TREASURER')
) {
  return NextResponse.redirect(new URL('/unauthorized', req.url))
}

// Auditor routes — AUDITOR or ADMIN
if (
  path.startsWith('/auditor') &&
  !roles.includes('AUDITOR') &&
  !roles.includes('ADMIN')
) {
  return NextResponse.redirect(new URL('/unauthorized', req.url))
}

// Migration — ADMIN only (already covered by /admin guard, kept explicit for clarity)
// The existing /admin catch-all handles this.
```

Updated matcher:

```typescript
export const config = {
  matcher: [
    '/treasurer/:path*',
    '/attendance/:path*',
    '/admin/:path*',
    '/finance/:path*',
    '/reports/:path*',
    '/auditor/:path*',
  ],
}
```

The existing auditor-to-non-auditor redirect (Req 11.9) is enforced by the `/admin` guard already catching AUDITOR role officers trying to reach admin routes (since AUDITOR is not in the ADMIN guard's allowed list).

---

## Data Models

### Prisma Schema Additions

```prisma
enum ConfigItemType {
  PROGRAM
  YEAR_LEVEL
  SHIRT_SIZE
  PAYMENT_METHOD
}

enum CashAdvanceStatus {
  OPEN
  LIQUIDATED
}

model SystemConfig {
  id        String         @id @default(cuid())
  type      ConfigItemType
  value     String
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())

  @@unique([type, value]) // enforced at DB level for dedup
}

model CashAdvance {
  id                String            @id @default(cuid())
  recipientName     String            @db.VarChar(100)
  purpose           String            @db.VarChar(255)
  amount            Decimal           @db.Decimal(15, 2)
  dateIssued        DateTime
  status            CashAdvanceStatus @default(OPEN)
  createdByOfficerId String
  createdBy         Officer           @relation(fields: [createdByOfficerId], references: [id])
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  expenses          Expense[]
  liquidationRecord LiquidationRecord?
}

model Expense {
  id                          String    @id @default(cuid())
  cashAdvanceId               String
  cashAdvance                 CashAdvance @relation(fields: [cashAdvanceId], references: [id])
  description                 String    @db.VarChar(255)
  vendorName                  String    @db.VarChar(100)
  amount                      Decimal   @db.Decimal(15, 2)
  datePurchased               DateTime
  acknowledgmentReceiptNumber String?   @unique
  // Snapshot fields — populated when AR is first generated
  arVendorName                String?
  arDescription               String?
  arAmount                    Decimal?  @db.Decimal(15, 2)
  arIssuedAt                  DateTime?
  createdAt                   DateTime  @default(now())

  evidence                    ExpenseEvidence[]
  liquidationExpenses         LiquidationExpense[]
}

model ExpenseEvidence {
  id         String   @id @default(cuid())
  expenseId  String
  expense    Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  fileUrl    String
  fileName   String
  uploadedAt DateTime @default(now())
}

model LiquidationRecord {
  id                  String   @id @default(cuid())
  cashAdvanceId       String   @unique  // one liquidation per advance
  cashAdvance         CashAdvance @relation(fields: [cashAdvanceId], references: [id])
  totalLiquidated     Decimal  @db.Decimal(15, 2)
  unliquidatedBalance Decimal  @db.Decimal(15, 2)
  submittedByOfficerId String
  submittedBy         Officer  @relation(fields: [submittedByOfficerId], references: [id])
  submittedAt         DateTime @default(now())

  liquidationExpenses LiquidationExpense[]
}

model LiquidationExpense {
  id                  String            @id @default(cuid())
  liquidationRecordId String
  liquidationRecord   LiquidationRecord @relation(fields: [liquidationRecordId], references: [id])
  expenseId           String            @unique  // each expense in at most one liquidation
  expense             Expense           @relation(fields: [expenseId], references: [id])
}
```

> **Note on snapshot fields on `Expense`:** The `ar*` columns store the point-in-time vendor name, description, and amount captured when an Acknowledgment Receipt is first generated (Req 5.4). They are `null` until `generateAcknowledgmentReceiptAction` fires.

### Relationship to Existing Models

- `CashAdvance` adds a new relation to `Officer` — the `Officer` model gains `cashAdvances CashAdvance[]`.
- `LiquidationRecord` adds another relation to `Officer` — the `Officer` model gains `liquidationRecords LiquidationRecord[]`.
- No existing tables, columns, or foreign keys are removed or renamed. `npx prisma migrate dev` will only emit `CREATE TABLE` and `ALTER TABLE ADD COLUMN` statements.

---

## Error Handling

### Validation Layer

All Server Actions validate inputs with explicit checks before touching the database. Errors are returned as typed `ActionResult` objects:

```typescript
type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }
```

Client components read `result.success` to decide whether to show a toast (success) or an inline error message (failure).

### Database Errors

- **Unique constraint violations** (e.g., duplicate `SystemConfig`, duplicate `acknowledgmentReceiptNumber`) are caught by `try/catch` around Prisma calls; the `P2002` error code is mapped to a user-readable message.
- **Foreign key violations** (deleting a `Config_Item` in use) are detected preemptively by checking reference counts before issuing the delete.
- **Transaction failures** roll back atomically — no partial state is persisted.

### File Upload Errors

Uploadthing returns structured errors. The `onUploadError` callback on the client component surfaces these as inline messages. The 10 MB limit and JPEG/PNG/PDF type restriction are enforced by Uploadthing's file router configuration, so invalid uploads are rejected before reaching the `onUploadComplete` callback.

### CSV Import Errors (Migration)

Row-level errors do not abort the import. Each row is processed independently inside a `try/catch`. The summary returned to the admin distinguishes:
- **Skipped** — missing required field, duplicate reference number, unresolvable collection period (the last case creates a new period instead, so this never actually skips).
- **Failed** — unexpected Prisma error or runtime exception.

### Scan Profile Summary Timeout

The attendance terminal calls `getScanProfileSummaryAction` after each scan. A `setTimeout` of 10 000 ms is set on the client side. If the server action has not resolved by then, the modal transitions to an error state for the history section. The student identity fields are populated from the `recordScanAction` result (synchronous with the scan) and are never affected by the history load failure.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Config Uniqueness

*For any* `ConfigItemType` and value string, there must never exist two `SystemConfig` records that are both `isActive = true` and share the same `(type, value)` pair. The database `@@unique([type, value])` constraint enforces this at the storage layer, and `addConfigItemAction` enforces it at the application layer via a case-insensitive check before insert.

**Validates: Requirement 1.6, Requirement 2.6**

### Property 2: Cash Advance Status Monotonicity

*For any* `CashAdvance` record, its `status` field may only transition from `OPEN` to `LIQUIDATED`. The reverse transition (`LIQUIDATED → OPEN`) must never occur. Once a liquidation record is committed, no code path may set `status` back to `OPEN`.

**Validates: Requirement 6.1, Requirement 6.3**

### Property 3: Expense Exclusivity

*For any* `Expense` record, there must be at most one `LiquidationExpense` row referencing it. The `@unique` constraint on `LiquidationExpense.expenseId` enforces this at the database level. `createLiquidationRecordAction` also pre-validates that none of the submitted expense IDs already appear in an existing `LiquidationExpense` row.

**Validates: Requirement 6.4**

### Property 4: Receipt Number Uniqueness Within a Calendar Year

*For any* two `Expense` records that both have a non-null `acknowledgmentReceiptNumber`, those numbers must be distinct. Numbers follow the format `AR-{year}-{seq}`, and sequences are assigned inside a `prisma.$transaction` with a `findFirst … orderBy desc` lock pattern to prevent gaps or collisions even under concurrent requests. The `@unique` constraint on `Expense.acknowledgmentReceiptNumber` provides a hard guarantee at the database level.

**Validates: Requirement 5.3, Requirement 5.4**

### Property 5: Liquidation Balance Correctness

*For any* `LiquidationRecord`, the following invariant must hold at the moment of creation and must remain true permanently (since neither `CashAdvance.amount` nor `totalLiquidated` is mutable after the transaction commits):

```
unliquidatedBalance = CashAdvance.amount − totalLiquidated
```

`createLiquidationRecordAction` computes `unliquidatedBalance` server-side before writing and includes both values in the same atomic transaction, so no divergence is possible.

**Validates: Requirement 6.2**

### Property 6: Audit Log Immutability

*For any* `AuditLog` record, once it is inserted it must never be updated or deleted. No Server Action, route handler, or Prisma query in the codebase issues an `update` or `delete` against the `AuditLog` model. The auditor UI exposes only read operations (`getAuditLogsAction`). This property is enforced by convention at the application layer; a database-level append-only policy (e.g., a `RULE` or trigger) may be added as an additional safeguard.

**Validates: Requirement 11.8**

### Property 7: Payment Claim Migration Idempotency

*For any* CSV row, reimporting it with the same normalized `reference_number` and `collectionPeriod` name must produce exactly one `PaymentClaim` — not two. `importPaymentRecordsAction` checks for an existing `PaymentClaim` with a matching `reference_number` and `collectionPeriodId` before attempting an insert, and skips the row (recording it as a duplicate) if one is found. Running the same import file twice therefore leaves the database state unchanged after the first successful run.

**Validates: Requirement 12.5**

### Property 8: Scan Profile Completeness

*For any* successful scan where `recordScanAction` returns a `StudentProfile`, the `ScanProfileSummaryModal` must always render the student's identity fields (name, student number, program, year level) — regardless of whether the subsequent `getScanProfileSummaryAction` call for attendance history or payment status succeeds, times out, or errors. Identity fields are sourced from the synchronous `recordScanAction` result and are never gated on the outcome of the asynchronous history/payment load. The modal transitions only the history and payment sections to an error state on failure; the identity section remains populated.

**Validates: Requirement 7.7**

---

## Testing Strategy

Property-based testing is **not applicable** to this feature set. All modules are CRUD operations, UI rendering, file I/O, or side-effect-driven workflows — none have the universal input/output properties that PBT tests efficiently. Example-based unit tests and integration tests are used instead.

### Unit Tests

Located under `src/__tests__/` or co-located as `*.test.ts`.

**Config Panel**
- `addConfigItemAction`: test each type's length boundary (at limit, one over), blank input, case-insensitive duplicate detection.
- `deleteConfigItemAction`: test "in use" guard returns error; test zero-reference delete succeeds.

**Finance Actions**
- `createCashAdvanceAction`: zero amount, future `dateIssued`, valid boundary values.
- `createExpenseAction`: zero amount, max file count (11th evidence file rejected), linking to non-OPEN advance.
- `generateAcknowledgmentReceiptAction`: receipt number sequence (first of year = `AR-{year}-0001`, year rollover resets).
- `createLiquidationRecordAction`: cross-advance expense rejection, already-liquidated expense rejection, over-advance total warning.

**Migration**
- CSV parse: all 9 headers present, one missing header, empty data rows, duplicate reference detection, >5 MB rejection.

**Audit Log**
- `getAuditLogsAction`: pagination offset/limit, combined filter AND logic, empty result set.

### Integration Tests

Run against a test database seeded with minimal fixtures.

**Attendance Terminal**
- Full scan cycle: scan → `recordScanAction` → `getScanProfileSummaryAction` → correct payment status badge for APPROVED / PENDING / UNPAID / no active period.

**Reporting Export**
- CSV export route: seeded data → GET `/api/reports/attendance/export?eventId=…` → response headers `Content-Type: text/csv`, correct column headers in body.
- PDF export route: returns status 200 with `Content-Type: text/html`.

**Middleware**
- FINANCE_OFFICER token → `/finance/cash-advances` allowed, `/reports/payments` redirects to `/unauthorized`.
- AUDITOR token → `/auditor/logs` allowed, `/admin/config` redirects to `/unauthorized`.

### Manual / Smoke Tests

- Acknowledgment Receipt print layout: open in Chrome, trigger print preview, verify no sidebar/navigation visible.
- Uploadthing evidence upload: upload a JPEG, a PNG, a PDF, and a `.xlsx` (should be rejected) via the Finance UI.
- Data migration: upload the template CSV with real data, verify summary counts, verify generated EReceipt rows in DB.
