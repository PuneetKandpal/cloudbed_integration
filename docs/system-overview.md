# Cloudbeds Booking Automation System

## 1. Purpose
Automate end-to-end handling of Hostelworld reservations pulled from Cloudbeds, including guest enrichment, cancellation-policy enforcement, payment capture, reminders, and escalation.

---

## 2. Architecture Highlights

### 2.1 Data Sources
1. **Cloudbeds Webhook (v1.3)** – entrypoint for reservation lifecycle.
2. **Cloudbeds API:**
   - `getReservationsWithRateDetails`: authoritative booking payload.
   - `getGuest?reservationID=`: guest email + `specialRequests` (free-cancel-until text).
3. **PostgreSQL via Prisma** – single source of truth for bookings, payments, risk, policies.

### 2.2 Key Services
| Service | Responsibility |
|---------|----------------|
| `BookingService` | Validates webhook, enriches booking with guest data, parses deadlines, persists booking. |
| `CloudbedApiService` | Wraps Cloudbeds API calls with tracing + retry-ready logging. |
| `CancellationPolicyService` | Provides configurable fallback days-before-checkin policy (per property or global). |
| `EmailService` | Sends reminders, warning, support alerts, manager escalations. |
| `RiskAssessmentService` | Scores bookings for payment urgency. |
| `PaymentService` | Authorizes + records gateway responses, exposes `authorizePayment`. |
| `SchedulerService` | Cron-driven orchestration (flex monitoring, retries, reminders, escalations). |

### 2.3 Booking Creation Flow
1. Receive webhook → ensure Hostelworld + relevant status.
2. Pull reservation details (single API call) and derive: stay window, totals, currency, room breakdown, policy type.
3. Fetch guest record via reservationID → capture `guestEmail` + `specialRequests`.
4. Parse `specialRequests` for deadline text `"Can be cancelled until: YYYY-MM-DD HH:mm:ss"`.
5. Determine final cancellation deadline:
   - **Primary:** parsed timestamp.
   - **Fallback:** DB-configured flexible policy window.
6. Persist booking with guest data, parsed deadline, fallback deadline, paid/remaining amounts, same-day flag, raw payload.
7. Log full context for observability.

---

## 3. Cancellation Deadline Resolution
1. **Parsed special requests** – authoritative if present. Stored in `parsedCancellationDeadline`. Logged with reasoning.
2. **Config fallback** – only when parsed deadline absent and policy type = FLEXIBLE. Uses `CancellationPolicyService`, subtracts configured `daysBeforeCheckin` from check-in date. Logged with propertyId + reason.

> *Result:* downstream services (scheduler, reminders) check `parsedCancellationDeadline ?? cancellationDeadline` ensuring Cloudbeds-provided constraints win.

---

## 4. Payment + Scheduler Workflows

## 4A. Condition -> Behavior Matrix (Plain Words)

### A) Booking ingestion

| Condition | What we do | Resulting state |
|-----------|------------|----------------|
| Webhook is not Hostelworld | Ignore | No booking row created |
| Booking already exists for same `reservationId` | Skip creation | Idempotent behavior |
| Guest API returns email | Store it | `Booking.guestEmail` is populated |
| Guest API returns special requests | Store it | `Booking.specialRequests` is populated |
| Special requests contain `"cancelled until: YYYY-MM-DD HH:mm:ss"` | Parse it and treat it as authoritative | `Booking.parsedCancellationDeadline` populated and used downstream |
| Special requests missing or don’t contain parsable deadline AND policy = FLEXIBLE | Use DB-config `daysBeforeCheckin` fallback | `Booking.cancellationDeadline` computed from check-in |
| Special request deadline present AND policy = FLEXIBLE | **Do NOT fetch DB policy** | Avoids extra DB fetch and avoids conflicting deadlines |

### B) Flexible bookings (cancellation window)

| Condition | What we do | Outcome |
|-----------|------------|---------|
| Now < `effectiveDeadline` | No payment attempt yet | Booking remains unpaid until deadline passes |
| Now >= `effectiveDeadline` | Trigger payment | Payment record created + gateway attempt executed |

Where `effectiveDeadline = parsedCancellationDeadline ?? cancellationDeadline`.

### C) Non-refundable bookings

| Condition | What we do | Outcome |
|-----------|------------|---------|
| Policy = NON_REFUNDABLE (or equivalent) | Attempt payment as early as possible (scheduler job enforces this) | Payment attempt starts immediately without waiting for any deadline |

### D) Payment retries

| Condition | What we do | Outcome |
|-----------|------------|---------|
| Payment failed and attempts remaining | Schedule/perform retry based on risk | Guest gets another attempt before escalation |
| Risk = HIGH/CRITICAL | Retry sooner (2h window) | More aggressive retry cadence |
| Risk = LOW/MEDIUM | Retry later (24h window) | Less aggressive to reduce noise |
| Attempts exceeded | Escalate to manager | `Booking.requiresManagerApproval = true` and manager email is sent |

### E) Reminders

| Condition | What we do | Outcome |
|-----------|------------|---------|
| Remaining balance > 0 and check-in is approaching | Send reminder (scheduler) | Guest receives payment reminder |
| Email sending fails (SMTP) | Log error and persist email record with failed status (depending on implementation) | Can be manually reprocessed |

### 4.1 Scheduler Cron Jobs
| Job | Schedule | Purpose |
|-----|----------|---------|
| `monitorFlexibleBookings` | hourly | After free-cancel window passes, automatically kick off payment workflow; ensures risk assessment exists. |
| `processNonRefundableBookings` | every 30m | Immediate payment attempts for NR bookings lacking payment records. |
| `processPaymentRetries` | hourly | Re-attempt failed payments based on risk window (2h risky, 24h normal). |
| `sendPaymentReminders` | every 12h | Email guests 48h prior to check-in when balance outstanding. |

### 4.2 Payment Workflow
1. Scheduler/booking calls `PaymentService.authorizePayment(bookingId, amount)`.
2. Service logs, creates `Payment` record (status PENDING), calls mocked gateway `authorizeAndCharge`.
3. Success → mark payment CAPTURED, set booking `paidAmount=total`, `remainingBalance=0`, optionally update status to CONFIRMED.
4. Failure → mark payment FAILED, store error, scheduler uses `PaymentStatus.FAILED` records for retry logic.
5. After ≥2 failed attempts (configurable), scheduler sets `requiresManagerApproval` and emails manager for manual decision.

### 4.3 Email Notifications
- **Payment Reminder**: booking info, amount, deadlines, contact guidance.
- **Support Notification**: triggered for high-risk bookings requiring staff intervention (manual call/email).
- **Cancellation Warning**: warns guest payment failure may cause cancellation (used before deadline/cut-off).
- **Manager Escalation**: details payment failure attempts, risk level, check-in, amount due.

All email attempts recorded in `Email` table with status transitions (PENDING → SENT or failure).

---

## 5. Risk Assessment Logic
`RiskAssessmentService.assessBookingRisk` analyses each booking:

1. **Time-to-check-in**
   - ≤24h: +50 points (same-day flag).
   - 24-48h: +30 points.
2. **Guest count**
   - > `HIGH_RISK_GUEST_THRESHOLD` (default 2): +20.
3. **Booking value**
   - `totalAmount > 500` (currency-specific) : +10.

| Score | Risk Level | Operational Impact |
|-------|------------|--------------------|
| ≥70 | CRITICAL | Immediate payment, escalated monitoring, qualifies for 2h retry window. |
| ≥50 | HIGH | Payment priority, expedited retries (2h). |
| ≥30 | MEDIUM | Standard workflow, but flagged for reminders. |
| <30 | LOW | Normal cadence, 24h retry window. |

Derived flags: `requiresImmediatePayment`, `priorityForCancellation`. Each assessment stored with JSON `assessmentData` (factors + scoring) and `assessedAt` timestamp for auditing.

---

## 6. Testing & Edge Cases
### 6.1 Guest / Cancellation
1. **Special request missing**: ensure fallback policy applies and logs reason.
2. **Malformed text**: regex fails gracefully, fallback triggered, logging indicates parse failure.
3. **Different timezone strings**: confirm `parseISO` handles Cloudbeds format; adjust tests if timezone data appears.
4. **Reservation re-delivery**: existing booking detection works (logger indicates skip). Note: reservationId must match Cloudbeds ID exactly to avoid duplicates.

### 6.2 Payment + Scheduler
1. **Flexible booking pre-deadline**: scheduler must ignore until `parsedCancellationDeadline ?? cancellationDeadline` passes.
2. **Non-refundable booking**: payment attempted even without scheduler (manual trigger) and also validated by scheduled job.
3. **Payment success**: booking marked `CONFIRMED`, `remainingBalance=0`; scheduler should no longer target it.
4. **Failed payment**: ensure `Payment` record increments attempt count, `nextRetryAt` set, logs include error message.
5. **Retry thresholds**: verify risk-based intervals (mock `riskAssessment.riskLevel` to HIGH/CRITICAL vs LOW).
6. **Escalation**: after configured attempts, `requiresManagerApproval` flips true and manager email triggered exactly once.
7. **Email transport failure**: ensure errors bubble with logging; `Email` record remains PENDING/FAILED for reprocessing.

### 6.3 Risk Assessment
1. **Same-day arrival**: ensures +50 score, immediate payment flag.
2. **High guest count**: threshold configurable; confirm env override.
3. **High value**: `totalAmount` reading from Prisma Decimal converted to number correctly.
4. **Multiple assessments**: scheduler should reuse most recent `riskAssessments[0]`; ensure ordering by `assessedAt` works.

### 6.4 Ops & Config
1. **CancellationPolicy**: property-specific vs global fallback (global used when `propertyId` no entry).
2. **Environment variables**: missing SMTP or Cloudbeds token should raise config errors before runtime.
3. **Scheduler**: confirm `ScheduleModule.forRoot()` and `SchedulerModule` imported to `AppModule` (already done).
4. **Port config**: `.env PORT` override verified (default 4000 per latest change).

---

## 7. Observability & Logging
- Every major action logs with `requestId` for traceability.
- Structured payload includes reservationId, propertyId, policy decisions, payment results.
- Failures logged via `LoggerService.logError` with stack + context.

---

## 8. Follow-up Enhancements (Future)
1. Replace mock payment gateway with real provider integration (Stripe, Adyen, etc.).
2. Store timezone information for parsed deadlines if Cloudbeds returns local time.
3. Add configurable reminder cadence (per property) + email templates per brand.
4. Introduce audit trail for scheduler executions (persist job run metadata).

---

## 9. Manual Testing Checklist
1. Trigger webhook with sample payload lacking special request → expect DB fallback deadline.
2. Trigger webhook including `"Can be cancelled until"` → expect parsed deadline stored + logged.
3. Confirm booking insertion logs `policyType`, `paidAmount`, `remainingBalance`.
4. Manually set `remainingBalance > 0`, run `npm run start` and observe cron logs for each job.
5. Simulate payment success/failure using mock randomness or by temporarily forcing `authorizeAndCharge` return values.
6. Inspect Prisma tables (`Booking`, `Payment`, `RiskAssessment`, `Email`) to ensure state transitions align with logs.
7. Run `npm run lint` + `npx prisma migrate dev` after schema/config edits.

---

By following this documentation and the edge-case checklist above, QA can validate the entire automation workflow from webhook ingestion through reminders, retries, and escalation.
