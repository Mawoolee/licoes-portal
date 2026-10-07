# Requirements Document

## Introduction

The LICOES Officer Management System (licoes-portal) is a web application for the League of Integrated Computer and Engineering Students at Divine Word College of Legazpi. The system already provides basic attendance scanning, membership fee submission, treasurer approval with e-receipt delivery, role-based authentication (ADMIN, ATTENDANCE_OFFICER, TREASURER, FINANCE_OFFICER, AUDITOR), alpha list import, and collection period/fee item management.

This requirements document covers all remaining modules needed to make the system fully operational:

1. **Admin Configuration Panel** — replace hardcoded program/year-level/shirt-size/payment-method values with a configurable database-driven system
2. **Finance Expense Recorder** — record itemized purchases against a cash advance with evidence uploads and Acknowledgment Receipt generation
3. **Liquidation Records** — reconcile cash advances against supported expenses, track unliquidated balances
4. **Scan Profile Summary** — enrich the attendance scanner popup with the scanned student's attendance history and payment status
5. **Reporting & Export** — filterable attendance and membership-fee reports exportable as CSV and PDF
6. **Audit Log UI** — chronological interface for the Auditor role to review sensitive system actions
7. **Data Migration** — import historical Google Form / Google Sheet payment records in bulk

---

## Glossary

- **Admin_Panel**: The set of admin-only pages under `/admin` for managing system-wide configuration.
- **Attendance_Terminal**: The barcode-scanner page at `/attendance` used by ATTENDANCE_OFFICER role.
- **Audit_Log**: The `AuditLog` database table that records sensitive officer actions with before/after values.
- **Audit_Log_UI**: The read-only interface at `/auditor` consumed by officers with the AUDITOR role.
- **Cash_Advance**: A disbursement of organization funds to an officer for a specific purpose before expenses are incurred.
- **Collection_Period**: A `CollectionPeriod` database record representing one semester's fee collection window (e.g., "A.Y. 2026-2027 1st Sem").
- **Config_Item**: A key-value record in the `SystemConfig` table used to drive select-lists across the portal (programs, year levels, shirt sizes, payment methods).
- **Expense_Evidence**: A file (image or PDF) uploaded to Uploadthing that proves a purchase was made; stored as a URL in the `ExpenseEvidence` table.
- **Expense_Recorder**: The interface under `/finance/expenses` used by officers with the FINANCE_OFFICER or ADMIN role.
- **Fee_Item**: A `FeeItem` record that belongs to a `CollectionPeriod` and defines the name and amount of one payable fee.
- **Finance_Officer**: An officer holding the `FINANCE_OFFICER` role; responsible for recording expenses and generating Acknowledgment Receipts.
- **Liquidation_Record**: A `LiquidationRecord` database record that reconciles one `CashAdvance` against its associated expenses.
- **Migration_Upload**: A CSV file conforming to the defined import template used to bulk-insert historical payment records.
- **Officer**: A `Officer` database record representing a system user; may hold one or more roles.
- **Payment_Claim**: A `PaymentClaim` database record representing a student's membership fee submission awaiting treasurer review.
- **Reporting_Module**: The set of pages and server actions under `/reports` providing filterable, exportable data.
- **Scan_Profile_Summary**: A modal or popover shown on the Attendance_Terminal after a successful scan, displaying the student's attendance history and payment status.
- **Student**: A `Student` database record imported from the SOECS alpha-list Excel file.
- **StudentProfile**: A `StudentProfile` database record that holds the canonical student identity linked to attendance records.
- **System_Config**: A global configuration table (`SystemConfig`) that stores portal-wide option lists (programs, year levels, shirt sizes, payment methods).

---

## Requirements

### Requirement 1: Admin Configuration Panel — Program List

**User Story:** As an Admin, I want to manage the list of academic programs in the system, so that form dropdowns across the portal always reflect the current programs offered at DWCL without requiring code changes.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a list of all `Config_Item` records of type `PROGRAM` where `isActive = true` on the page `/admin/config`; records with `isActive = false` are NOT displayed.
2. WHEN an Admin submits a valid new program name via the Config_Panel form, THE System SHALL create a new `Config_Item` record of type `PROGRAM` with `isActive = true` and reflect it in the list on the same page response without requiring a manual page reload.
3. IF an Admin submits a program name fewer than 1 character or more than 20 characters, THEN THE System SHALL return a validation error without creating a record; the error message SHALL indicate the name length requirement (1–20 characters).
4. WHEN an Admin toggles a program's active status, THE System SHALL update the corresponding `Config_Item.isActive` field; the toggled state SHALL be visible in the list on the same page response, and subsequent loads of dropdown pages SHALL reflect the change.
5. IF an Admin attempts to delete a `Config_Item` that is referenced by at least one `StudentProfile`, `PaymentClaim`, or `Student` record, THEN THE System SHALL return an error message stating "record is in use" and leave all referencing records unchanged.
6. WHEN an Admin deletes a `Config_Item` that has zero references, THE System SHALL remove the record; subsequent loads of any page containing a program dropdown SHALL no longer include the deleted program.

---

### Requirement 2: Admin Configuration Panel — Year Level, Shirt Size, and Payment Method Lists

**User Story:** As an Admin, I want to manage year levels, shirt sizes, and accepted payment methods from the admin panel, so that all intake forms use a single authoritative source of truth without hardcoded values.

#### Acceptance Criteria

1. WHEN an Admin navigates to `/admin/config`, THE Admin_Panel SHALL display separate management sections for `Config_Item` records of types `YEAR_LEVEL`, `SHIRT_SIZE`, and `PAYMENT_METHOD`.
2. WHEN an Admin adds a valid entry for any of these types, THE System SHALL create the corresponding `Config_Item` record and make it immediately available in all form dropdowns that reference that type.
3. IF an Admin submits a shirt size value longer than 10 characters, THEN THE System SHALL reject the submission with a validation error.
4. IF an Admin submits a payment method name longer than 50 characters, THEN THE System SHALL reject the submission with a validation error.
5. IF an Admin submits a blank or empty value for any config item type, THEN THE System SHALL reject the submission with a validation error.
6. IF an Admin submits a value that duplicates an existing active `Config_Item` of the same type (case-insensitive), THEN THE System SHALL reject the submission with a "duplicate entry" validation error.
7. WHEN an Admin deactivates a `Config_Item`, THE System SHALL exclude it from all new form dropdowns while preserving it on existing records that already reference it.
8. WHEN the Submit_Claim form loads, THE Submit_Claim form SHALL read its program list, year level options, shirt size options, and payment method options exclusively from active `Config_Item` records of the corresponding types.

---

### Requirement 3: Finance Expense Recorder — Cash Advance Management

**User Story:** As a Finance Officer, I want to record cash advances issued to officers, so that every disbursement has a traceable record before expenses are incurred.

#### Acceptance Criteria

1. WHEN a Finance Officer submits a valid Cash Advance form on `/finance/cash-advances`, THE System SHALL create a `CashAdvance` record with: recipient officer name (non-empty string ≤ 100 characters), purpose (non-empty string ≤ 255 characters), amount (positive decimal up to 2 decimal places), dateIssued (not in the future), and `status = OPEN`.
2. IF the submitted amount is zero or negative, THEN THE System SHALL return a validation error without saving the record.
3. THE Finance_Officer interface SHALL list all `CashAdvance` records ordered by `dateIssued` descending, showing recipient, purpose, amount, and current status.
4. WHILE a `CashAdvance` has `status = OPEN`, THE System SHALL allow adding `Expense` records linked to it.
5. IF no `LiquidationRecord` exists for the `CashAdvance`, THEN THE System SHALL reject the LIQUIDATED status change with an error message.
6. IF a Finance Officer attempts to add an `Expense` to a `CashAdvance` with `status = LIQUIDATED`, THEN THE System SHALL reject the request with an error indicating the advance is already liquidated.
7. WHEN a `CashAdvance` is created or updated, THE System SHALL write an `AuditLog` entry recording: `officerId`, action type (`CASH_ADVANCE_CREATED` or `CASH_ADVANCE_UPDATED`), `cashAdvanceId`, previous values (on update), and new values.

---

### Requirement 4: Finance Expense Recorder — Itemized Expense Entry

**User Story:** As a Finance Officer, I want to record itemized expenses with supporting evidence, so that every purchase is documented and traceable to a specific cash advance.

#### Acceptance Criteria

1. WHEN a Finance Officer submits a valid expense entry linked to an open `CashAdvance`, THE System SHALL create an `Expense` record with: description (non-empty, ≤ 255 characters), vendorName (non-empty, ≤ 100 characters), amount (0.01–999,999,999.99), datePurchased (not in the future), and `cashAdvanceId` (must reference an `OPEN` `CashAdvance`).
2. IF the expense amount is zero or negative, THEN THE System SHALL return a validation error.
3. IF an expense entry includes an uploaded file, THE System SHALL store the Uploadthing URL in an `ExpenseEvidence` record linked to that `Expense`; the maximum number of evidence files per expense is 10.
4. WHEN a Finance Officer uploads an evidence file, THE System SHALL accept JPEG, PNG, and PDF formats up to 10 MB per file.
5. IF an uploaded file exceeds 10 MB or is not a JPEG, PNG, or PDF, THEN THE System SHALL reject the upload with an error message indicating the specific reason (file too large, or unsupported file format).
6. WHEN a Finance Officer selects a `CashAdvance`, THE Expense_Recorder interface SHALL display all expenses under that selected `CashAdvance`, showing description, vendor, amount, date, and a link to each evidence file.
7. IF a Finance Officer attempts to add an `Expense` to a `CashAdvance` that is not in `OPEN` status, THEN THE System SHALL reject the request with an error indicating the advance must be open.
8. WHEN an `Expense` record is created, THE System SHALL write an `AuditLog` entry.

---

### Requirement 5: Finance Expense Recorder — Acknowledgment Receipt Generation

**User Story:** As a Finance Officer, I want to generate a printable Acknowledgment Receipt for an expense, so that vendors and approvers have a formatted document confirming the transaction.

#### Acceptance Criteria

1. WHEN a Finance Officer requests an Acknowledgment Receipt for an `Expense`, THE System SHALL generate an HTML page at `/finance/expenses/[expenseId]/acknowledgment-receipt` containing: receipt number, date, vendor name, description, amount in words, Finance Officer name, and organization name.
2. WHEN the Acknowledgment Receipt page is rendered in a browser print context, THE System SHALL apply a print stylesheet that hides all navigation bars, sidebars, header menus, and action buttons, displaying only the receipt content.
3. WHEN an Acknowledgment Receipt is generated for the first time for an `Expense`, THE System SHALL auto-assign a receipt number formatted as `AR-[YEAR]-[NNNN]`, where `[YEAR]` is the 4-digit calendar year and `[NNNN]` is a zero-padded sequential integer starting at `0001`, incrementing per calendar year, and resetting to `0001` at the start of each new calendar year.
4. WHEN an Acknowledgment Receipt is generated for the first time, THE System SHALL persist a snapshot of the receipt number, vendor name, description, and amount so subsequent views return the same values regardless of later changes to the `Expense`.
5. IF an `Expense` is not in an `approved` state (i.e., has no linked acknowledged evidence), THEN THE System SHALL reject receipt generation with an error.
6. WHEN an Acknowledgment Receipt is generated, THE System SHALL write an `AuditLog` entry recording: `expenseId`, assigned receipt number, Finance Officer user identifier, and timestamp of generation.

---

### Requirement 6: Liquidation Records — Reconciliation

**User Story:** As a Finance Officer, I want to create liquidation records that reconcile a cash advance against its expenses, so that the organization can track how much has been accounted for and how much remains unliquidated.

#### Acceptance Criteria

1. WHEN a Finance Officer submits a valid liquidation form for an open `CashAdvance`, THE System SHALL create a `LiquidationRecord` with: `cashAdvanceId`, list of included `Expense` IDs, total liquidated amount, and `submittedAt` timestamp; "valid" means the `CashAdvance` status is `OPEN`, at least one `Expense` is included, and `totalLiquidated` equals the sum of included `Expense` amounts.
2. WHEN a `LiquidationRecord` is created, THE System SHALL calculate `unliquidatedBalance` as `CashAdvance.amount − totalLiquidated` and persist it on the `LiquidationRecord`.
3. IF a Finance Officer attempts to include an `Expense` that belongs to a different `CashAdvance`, THEN THE System SHALL reject the submission with a validation error and THE System SHALL NOT create the `LiquidationRecord`.
4. IF any included `Expense` is already referenced by an existing `LiquidationRecord`, THEN THE System SHALL reject the submission with an error identifying the conflicting expense.
5. IF the total of included expenses exceeds the `CashAdvance.amount`, THEN THE System SHALL return a validation warning; IF the Finance Officer does not confirm, THE System SHALL discard the submission without creating a `LiquidationRecord`.
6. THE Liquidation Records page at `/finance/liquidation` SHALL list all `LiquidationRecord` rows with cash advance purpose, total advanced, total liquidated, and unliquidated balance.
7. WHEN a `LiquidationRecord` is created, THE System SHALL write an `AuditLog` entry.

---

### Requirement 7: Scan Profile Summary — Attendance History Display

**User Story:** As an Attendance Officer, I want to see a student's attendance history in a popup immediately after scanning their ID, so that I can quickly verify if they have scanned in at previous events without leaving the scanning terminal.

#### Acceptance Criteria

1. WHEN the Attendance_Terminal successfully records a scan, THE System SHALL display a `Scan_Profile_Summary` modal containing: student full name, student number, program, year level, and a list of the student's last 10 attendance sessions across all events, ordered from most recent to oldest.
2. THE Scan_Profile_Summary SHALL show for each session: event name, date, time-in, and time-out (displayed as "—" if the student has not yet timed out).
3. THE Scan_Profile_Summary SHALL remain visible until the Attendance Officer dismisses it or a new scan is received.
4. WHEN a new scan is received, THE System SHALL replace the current Scan_Profile_Summary with the new scan's profile data.
5. WHILE the Scan_Profile_Summary is loading attendance history from the server, THE System SHALL display a loading indicator in the modal so the officer is not left with a blank popup.
6. IF the scanned student has no prior attendance records, THE Scan_Profile_Summary SHALL display the message "No previous attendance records found."
7. IF the attendance history fails to load within 10 seconds, THE System SHALL display an error state in the modal; the student identity fields (name, number, program, year level) SHALL remain visible even if history fails to load.

---

### Requirement 8: Scan Profile Summary — Payment Status Display

**User Story:** As an Attendance Officer, I want to see a student's membership fee payment status inside the scan popup, so that I can inform them on the spot if they still need to submit a payment claim.

#### Acceptance Criteria

1. WHEN a scan completes and an active `Collection_Period` exists (start date ≤ current date ≤ end date), THE Scan_Profile_Summary SHALL display the student's payment status for that active `Collection_Period` as one of: UNPAID, PENDING, or APPROVED.
2. WHEN the payment status is APPROVED, THE Scan_Profile_Summary SHALL display the e-receipt number alongside the status.
3. WHEN the payment status is PENDING, THE Scan_Profile_Summary SHALL display the submission date of the pending `Payment_Claim`.
4. WHEN the payment status is UNPAID, THE Scan_Profile_Summary SHALL display a visible text notice directing the student to the submit-claim URL.
5. IF no `Collection_Period` is currently active, THE Scan_Profile_Summary SHALL omit the payment status section entirely.

---

### Requirement 9: Reporting & Export — Attendance Report

**User Story:** As an Admin or Finance Officer, I want to generate a filterable attendance report for any event, so that I can review participation data and export it for official records.

#### Acceptance Criteria

1. THE Reporting_Module SHALL provide a page at `/reports/attendance` accessible to officers with ADMIN or FINANCE_OFFICER roles.
2. WHEN a user has not yet selected an event, THE System SHALL disable the export buttons and display placeholder text "Select an event to view attendance records".
3. WHEN a user selects an event from the filter and submits the form, THE System SHALL display an attendance table showing one row per Attendance Session: student number, full name, program, year level, time-in, and time-out for all sessions in that event; a student with multiple sessions appears in multiple rows.
4. THE Reporting_Module SHALL support filtering by program and by attendance status (PRESENT / ABSENT).
5. WHEN multiple filter criteria are applied simultaneously, THE System SHALL return only records that satisfy ALL active filter criteria (AND logic).
6. WHEN a user clicks "Export CSV", THE System SHALL generate and download a `.csv` file containing all rows matching the current filter.
7. WHEN a user clicks "Export PDF", THE System SHALL generate and download a `.pdf` file containing a formatted attendance table with event name and date in the header.
8. THE exported CSV file SHALL include column headers: `Student Number`, `Full Name`, `Program`, `Year Level`, `Time In`, `Time Out`, `Status`.
9. IF no records match the applied filters, THE System SHALL display "No attendance records found for the selected filters" and disable both export buttons.

---

### Requirement 10: Reporting & Export — Membership Fee Report

**User Story:** As a Treasurer or Admin, I want to generate a filterable membership fee collection report, so that I can track payment statuses and total collected amounts per collection period.

#### Acceptance Criteria

1. THE Reporting_Module SHALL provide a page at `/reports/payments` accessible to officers with ADMIN or TREASURER roles.
2. WHEN a user selects a `Collection_Period` and submits the form, THE System SHALL display a table showing: student number, full name, program, year level, payment method, reference number, amount (displayed at PHP currency precision — 2 decimal places), submission date, status, and a Receipt No column displaying the EReceipt number for APPROVED claims and "—" for all other statuses.
3. THE Reporting_Module SHALL support filtering by payment status (PENDING, APPROVED, REJECTED) and by program.
4. THE Reporting_Module SHALL display a summary row showing total collected (sum of APPROVED amounts) and total pending (count of PENDING claims) for the selected `Collection_Period`.
5. WHEN multiple filter criteria are applied, THE System SHALL return only records satisfying ALL active filters (AND logic).
6. WHEN a user clicks "Export CSV", THE System SHALL generate and download a `.csv` file containing all rows matching the current filter with column headers: `Student Number`, `Full Name`, `Program`, `Year Level`, `Payment Method`, `Reference No`, `Amount`, `Submitted At`, `Status`, `Receipt No`.
7. WHEN a user clicks "Export PDF", THE System SHALL generate and download a `.pdf` file containing the filtered table, the summary row, and the collection period name in the header.
8. IF no records match the applied filters, THE System SHALL display "No payment records found for the selected filters" and disable both export buttons.

---

### Requirement 11: Audit Log UI — Chronological View

**User Story:** As an Auditor, I want to browse a chronological list of all sensitive system actions, so that I can review who did what and when without needing direct database access.

#### Acceptance Criteria

1. THE Audit_Log_UI SHALL be accessible at `/auditor/logs` exclusively to officers with the AUDITOR or ADMIN role.
2. THE Audit_Log_UI SHALL display `AuditLog` records in reverse chronological order (most recent first), showing: timestamp, officer name, action type, target record type, and record ID.
3. WHEN a user clicks on an audit log row, THE System SHALL expand it to show the full `previousVal` and `newVal` JSON fields formatted as readable key-value pairs; IF `previousVal` or `newVal` is null, THE System SHALL display "—" in place of the JSON field.
4. THE Audit_Log_UI SHALL support filtering by officer name, action type, target record type, and a date range.
5. WHEN a user applies a filter, THE System SHALL return only `AuditLog` records matching all active filter criteria.
6. IF no `AuditLog` records match the applied filters, THE Audit_Log_UI SHALL display "No audit records found for the selected filters" and show zero for the total record count.
7. THE Audit_Log_UI SHALL paginate results at 50 records per page, displaying the current page and total record count.
8. THE Audit_Log_UI SHALL be read-only; THE System SHALL not expose any controls that create, modify, or delete `AuditLog` records.
9. WHEN an officer with the AUDITOR role but not the ADMIN role accesses any non-`/auditor` admin route, THE System SHALL redirect them to `/unauthorized`.

---

### Requirement 12: Data Migration — Historical Payment Record Import

**User Story:** As an Admin, I want to import historical payment records from a CSV file exported from Google Forms/Sheets, so that past membership payments are visible in the system without manual re-entry.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a data migration page at `/admin/migration` where an Admin can download a CSV import template.
2. THE CSV import template SHALL define these required columns: `student_number`, `full_name`, `program`, `year_level`, `payment_method`, `reference_number`, `amount`, `payment_date`, `collection_period_name`.
3. WHEN an Admin uploads a valid CSV file on the migration page, THE System SHALL parse each row and upsert a `PaymentClaim` record with `status = APPROVED` and a generated `EReceipt` record without sending an email; a "valid CSV" is one that is parseable UTF-8 CSV, contains all 9 required columns as headers, and has at least one data row.
4. IF a CSV row is missing any required column value, THEN THE System SHALL skip that row and record it in a per-import error log, then continue processing remaining rows; a "skipped" row is one with a missing required value, while a "failed" row is one that threw an unexpected processing error.
5. IF a CSV row contains a `reference_number` that already exists as a `normalizedReference` in the `PaymentClaim` table for the same collection period, THEN THE System SHALL skip that row and record it as a duplicate in the error log.
6. IF the `collection_period_name` in a CSV row does not match any existing `CollectionPeriod.name`, THEN THE System SHALL create a new inactive `CollectionPeriod` with that name before creating the `PaymentClaim`.
7. WHEN a migration import completes, THE System SHALL display a summary showing: total rows processed, rows successfully imported, rows skipped (with reasons), and rows that failed.
8. WHEN a migration import runs, THE System SHALL write a single `AuditLog` entry of action type `BULK_PAYMENT_IMPORT` recording the Admin's officer ID, the import file name, and the import summary counts.
9. THE Migration_Upload file size SHALL not exceed 5 MB; IF the uploaded file exceeds 5 MB, THEN THE System SHALL reject it before parsing with an error message stating the 5 MB file size limit.

---

### Requirement 13: Middleware — Route Protection for New Roles

**User Story:** As a system administrator, I want all new module routes to be protected by role checks in the Next.js middleware, so that unauthorized officers cannot access sensitive pages.

#### Acceptance Criteria

1. THE System SHALL restrict `/finance/:path*` routes to officers with FINANCE_OFFICER or ADMIN roles; WHEN an officer without these roles accesses a finance route, THE System SHALL redirect them to `/unauthorized`.
2. THE System SHALL restrict `/reports/attendance` to officers with ADMIN or FINANCE_OFFICER roles; WHEN an officer without these roles accesses the attendance report route, THE System SHALL redirect them to `/unauthorized`.
3. THE System SHALL restrict `/reports/payments` to officers with ADMIN or TREASURER roles; WHEN an officer without these roles accesses the payment report route, THE System SHALL redirect them to `/unauthorized`.
4. THE System SHALL restrict `/auditor/:path*` routes to officers with AUDITOR or ADMIN roles; WHEN an officer without these roles accesses an auditor route, THE System SHALL redirect them to `/unauthorized`.
5. THE System SHALL restrict `/admin/migration` to officers with ADMIN role; WHEN an officer without ADMIN role accesses the migration route, THE System SHALL redirect them to `/unauthorized`.

---

### Requirement 14: Schema Extensions — New Database Models

**User Story:** As a developer, I want the Prisma schema to include all models required by the new modules, so that all features have a consistent and normalized data layer.

#### Acceptance Criteria

1. THE System SHALL add a `SystemConfig` model to the Prisma schema with fields: `id`, `type` (enum with values: `PROGRAM`, `YEAR_LEVEL`, `SHIRT_SIZE`, `PAYMENT_METHOD`), `value` (String), `isActive` (Boolean, default true), `createdAt`.
2. THE System SHALL add a `CashAdvance` model with fields: `id`, `recipientName`, `purpose`, `amount` (Decimal), `dateIssued` (DateTime), `status` (enum with values: `OPEN`, `LIQUIDATED`), `createdByOfficerId`, `createdAt`, `updatedAt`.
3. THE System SHALL add an `Expense` model with fields: `id`, `cashAdvanceId` (FK to `CashAdvance`), `description`, `vendorName`, `amount` (Decimal), `datePurchased` (DateTime), `acknowledgmentReceiptNumber` (String?, unique), `createdAt`.
4. THE System SHALL add an `ExpenseEvidence` model with fields: `id`, `expenseId` (FK to `Expense`), `fileUrl` (String), `fileName` (String), `uploadedAt` (DateTime default now).
5. THE System SHALL add a `LiquidationRecord` model with fields: `id`, `cashAdvanceId` (FK to `CashAdvance`, unique — one liquidation per advance), `totalLiquidated` (Decimal), `unliquidatedBalance` (Decimal), `submittedByOfficerId`, `submittedAt`.
6. THE System SHALL add a `LiquidationExpense` join model linking `LiquidationRecord` to `Expense` with fields: `id`, `liquidationRecordId`, `expenseId`; the relationship is one-to-many from `LiquidationRecord`, and each `Expense` can appear in at most one `LiquidationRecord`.
7. FOR ALL new models, THE System SHALL verify that running `npx prisma migrate dev` produces a valid migration; WHEN `npx prisma migrate dev` runs with the new models, no existing table columns or foreign keys SHALL be dropped or renamed.
