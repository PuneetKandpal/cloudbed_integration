# System Test Cases — Payment Automation

Comprehensive test coverage for the Cloudbeds-Hostelworld payment automation system, covering end-to-end workflows, edge cases, failure scenarios, and security considerations.

---

## 1. End-to-End Workflow Tests

### 1.1 Complete Booking Lifecycle (Happy Paths)

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| **TC-E2E-01** | Worker Success Flow | 1. Webhook `reservation/created` received<br>2. Booking created → Risk assessed<br>3. Worker charges successfully<br>4. Payment captured | Booking `status=CONFIRMED`, `remainingBalance=0`, Payment `status=CAPTURED` |
| **TC-E2E-02** | Payment Link Flow | 1. Webhook received<br>2. Worker fails to charge<br>3. Scheduler sends payment link<br>4. Guest pays via link | Payment link email sent; on payment, balance cleared; no second worker attempt |
| **TC-E2E-03** | Resend + Escalation Flow | 1. Worker fails<br>2. Payment link sent<br>3. 24h passes (low risk)<br>4. Payment link resent<br>5. Still unpaid → Admin notified | Exactly 2 payment link emails; admin cancellation request on threshold |
| **TC-E2E-04** | Same-Day Check-In | Booking created at 09:00, check-in at 14:00 same day | Immediate payment attempt regardless of policy type |
| **TC-E2E-05** | Multi-Room Booking | Booking with 3 sub-reservations | All rooms linked to parent booking; payment calculated correctly |

### 1.2 Policy-Based Variations

| Test ID | Policy Type | Condition | Expected Behavior |
|---------|-------------|-----------|-----------------|
| **TC-POL-01** | Non-Refundable | New booking created | Payment attempted within 5 minutes via `processNonRefundableBookings` |
| **TC-POL-02** | Flexible | Deadline in 7 days | No payment until deadline; reminder sent at T-48h |
| **TC-POL-03** | Flexible | Deadline in 2 hours | Payment attempted immediately after deadline passes |
| **TC-POL-04** | Flexible | Deadline already passed | Immediate payment attempt on webhook processing |
| **TC-POL-05** | Unknown/Not parsed | No cancellation policy detected | Defaults to most restrictive (treat as non-refundable) |

---

## 2. Worker-First, Payment-Link Fallback Tests

### 2.1 Worker Charge Scenarios

| Test ID | Worker Result | System Response |
|---------|--------------|-----------------|
| **TC-WORK-01** | Worker succeeds | Payment `CAPTURED`; no payment link sent; booking confirmed |
| **TC-WORK-02** | Worker fails (invalid card) | Payment `FAILED`; payment link email triggered |
| **TC-WORK-03** | Worker fails (insufficient funds) | Payment `FAILED`; payment link email triggered |
| **TC-WORK-04** | Worker fails (card expired) | Payment `FAILED`; payment link email triggered |
| **TC-WORK-05** | Worker times out (IN_PROGRESS > 30 min) | Treated as FAILED; payment link fallback activated |
| **TC-WORK-06** | Worker crashes mid-charge | ChargeTask stuck IN_PROGRESS; after timeout, payment link sent |

### 2.2 Payment Link Resend Logic

| Test ID | Risk Level | Time Since Last Link | Expected Action |
|---------|------------|---------------------|-----------------|
| **TC-LINK-01** | HIGH/CRITICAL | 119 minutes | SKIP — not yet 2 hours |
| **TC-LINK-02** | HIGH/CRITICAL | 121 minutes | RESEND — exceeds 2h threshold |
| **TC-LINK-03** | LOW/MEDIUM | 23 hours 59 min | SKIP — not yet 24 hours |
| **TC-LINK-04** | LOW/MEDIUM | 24 hours 1 min | RESEND — exceeds 24h threshold |
| **TC-LINK-05** | HIGH | Exactly 2 hours | RESEND — boundary condition |
| **TC-LINK-06** | LOW | Exactly 24 hours | RESEND — boundary condition |

### 2.3 Admin Escalation Threshold

| Test ID | `cancelRequestAfterFailures` | Payment Link Count | Worker Fail Count | Action |
|---------|------------------------------|-------------------|-------------------|--------|
| **TC-ADMIN-01** | 2 | 2 | 2 | Admin notified |
| **TC-ADMIN-02** | 2 | 1 | 2 | WAIT — need 2 payment links |
| **TC-ADMIN-03** | 3 | 3 | 2 | WAIT — need 3 payment links |
| **TC-ADMIN-04** | 2 | 2 | 1 | WAIT — need 2 worker failures |
| **TC-ADMIN-05** | 1 | 1 | 1 | Admin notified (aggressive threshold) |

---

## 3. Edge Cases — Data & State

### 3.1 Missing or Invalid Guest Data

| Test ID | Condition | Expected Behavior |
|---------|-----------|-------------------|
| **TC-GUEST-01** | `guestEmail` is null | Support notification sent; no payment link email; logged warning |
| **TC-GUEST-02** | `guestEmail` is empty string | Treated as null; same as TC-GUEST-01 |
| **TC-GUEST-03** | `guestEmail` is malformed | SMTP failure caught; Email record `status=FAILED`; retry possible |
| **TC-GUEST-04** | Guest name missing | Email sent with generic greeting ("Dear Guest"); no error |
| **TC-GUEST-05** | Guest phone only (no email) | Cannot send payment link; escalation path to admin faster |

### 3.2 Cancellation Deadline Edge Cases

| Test ID | Scenario | Expected |
|---------|----------|----------|
| **TC-DEADLINE-01** | `parsedCancellationDeadline` null, `cancellationDeadline` set | Use `cancellationDeadline` |
| **TC-DEADLINE-02** | Both deadlines null | Treat as immediate payment required (safest) |
| **TC-DEADLINE-03** | Deadline in past (booking created after deadline) | Immediate payment attempt |
| **TC-DEADLINE-04** | Deadline exactly now | Trigger payment (boundary condition) |
| **TC-DEADLINE-05** | Malformed date in specialRequests | Parse fails gracefully; fallback to `cancellationDeadline` |
| **TC-DEADLINE-06** | Timezone ambiguity (e.g., DST transition) | Use property timezone; log warning if ambiguous |

### 3.3 Financial Edge Cases

| Test ID | Condition | Expected |
|---------|-----------|----------|
| **TC-FIN-01** | `remainingBalance = 0.01` (minimum charge) | Payment attempted; gateway fees may exceed amount |
| **TC-FIN-02** | `remainingBalance = 0` | No payment attempted; booking confirmed directly |
| **TC-FIN-03** | `totalAmount` negative (refund scenario) | Log error; do not attempt charge; manual review |
| **TC-FIN-04** | Currency mismatch (booking in USD, card in EUR) | Gateway handles conversion; logged for reconciliation |
| **TC-FIN-05** | Very large amount (>$10,000) | Risk assessment flags as HIGH; immediate payment + manager alert |
| **TC-FIN-06** | Decimal precision (e.g., 99.999) | Rounded correctly; no floating-point errors |

---

## 4. Concurrency & Race Conditions

### 4.1 Simultaneous Operations

| Test ID | Race Condition | Outcome |
|---------|---------------|---------|
| **TC-RACE-01** | Duplicate webhooks (same reservationId) | Exactly 1 Booking created; others logged as duplicates |
| **TC-RACE-02** | Scheduler + Manual payment-link endpoint | At most 1 email sent; second returns "already sent" or deduplicated |
| **TC-RACE-03** | Worker updates Payment to CAPTURED while scheduler checking FAILED | Scheduler sees current state; no payment link sent |
| **TC-RACE-04** | Two scheduler instances running simultaneously (no distributed lock) | Both may query same bookings; DB constraints prevent duplicate emails |
| **TC-RACE-05** | Booking cancelled while payment in progress | Payment attempt stopped; ChargeTask cancelled; no double-charge |
| **TC-RACE-06** | Guest pays via link while worker retrying (old flow) | Not applicable — no worker retries in new flow |

### 4.2 Idempotency Tests

| Test ID | Repeated Action | Expected |
|---------|-----------------|----------|
| **TC-IDEMP-01** | Run `monitorFlexibleBookings` 10x in 1 minute | No duplicate Payment/ChargeTask for same booking |
| **TC-IDEMP-02** | Run `processPaymentRetries` 10x in 1 minute | At most 1 payment link email per booking (first send) |
| **TC-IDEMP-03** | Run `sendPaymentReminders` multiple times | Duplicate reminders possible (by design); no system error |
| **TC-IDEMP-04** | Re-send webhook with same eventId | Idempotent processing; no duplicate booking |

---

## 5. Integration Failure Scenarios

### 5.1 External Service Failures

| Test ID | Service | Failure Mode | System Response |
|---------|---------|--------------|-----------------|
| **TC-FAIL-01** | Cloudbed API | 500 Internal Server Error | Retry with exponential backoff; log error; continue with other bookings |
| **TC-FAIL-02** | Cloudbed API | 429 Rate Limited | Backoff 60s; queue for retry; alert if persistent |
| **TC-FAIL-03** | Cloudbed API | 404 Reservation not found | Log error; mark booking for manual review; skip payment |
| **TC-FAIL-04** | Cloudbed API | Timeout (>30s) | Circuit breaker pattern; fail fast; retry later |
| **TC-FAIL-05** | SMTP Server | Connection refused | Email queued with `status=PENDING`; retry on next cycle |
| **TC-FAIL-06** | SMTP Server | 5xx Permanent failure | Email `status=FAILED`; alert ops; manual intervention needed |
| **TC-FAIL-07** | Database | Connection pool exhausted | Request queued or 503 returned; no data corruption |
| **TC-FAIL-08** | Database | Deadlock on concurrent update | Automatic retry (Prisma); log warning if persists |

### 5.2 Partial Failure Handling

| Test ID | Scenario | Data Consistency |
|---------|----------|----------------|
| **TC-PART-01** | Payment recorded but ChargeTask not created | Orphan detection job fixes; or manual cleanup |
| **TC-PART-02** | ChargeTask created but Payment not committed | Rollback; retry creates new Payment |
| **TC-PART-03** | Email sent but DB record not saved | Inconsistent state; reconciliation job detects |
| **TC-PART-04** | Booking created but RiskAssessment fails | Booking exists without risk; default to MEDIUM; alert |
| **TC-PART-05** | Webhook processed but booking creation fails | WebhookEvent marked error; manual retry possible |

---

## 6. Security Tests

### 6.1 Input Validation & Injection

| Test ID | Input | Expected |
|---------|-------|----------|
| **TC-SEC-01** | `reservationId` = `'; DROP TABLE Booking; --` | Sanitized; literal string stored; no SQL error |
| **TC-SEC-02** | `guestEmail` = `<script>alert('xss')</script>` | HTML escaped in email body; no script execution |
| **TC-SEC-03** | Webhook payload = 10MB JSON | Rejected (size limit); 413 Payload Too Large |
| **TC-SEC-04** | Webhook payload = malformed JSON | 400 Bad Request; error logged |
| **TC-SEC-05** | `propertyId` = non-existent ID | Handled gracefully; no crash; appropriate error |
| **TC-SEC-06** | `totalAmount` = `1e309` (Infinity) | Validation error; default or reject |

### 6.2 Authentication & Authorization

| Test ID | Endpoint | Condition | Expected |
|---------|----------|-----------|----------|
| **TC-AUTH-01** | `POST /scheduler/run/*` | No API key | 401 Unauthorized |
| **TC-AUTH-02** | `POST /webhook/cloudbed` | Invalid signature | 403 Forbidden |
| **TC-AUTH-03** | `POST /webhook/cloudbed` | Replay attack (old timestamp) | 403 Forbidden (timestamp validation) |
| **TC-AUTH-04** | `GET /health` | No auth | 200 OK (public endpoint) |

### 6.3 Data Privacy

| Test ID | Check | Expected |
|---------|-------|----------|
| **TC-PRIV-01** | Logs contain email addresses | Masked: `j***@example.com` or hashed |
| **TC-PRIV-02** | Logs contain card numbers | Never logged; only last4 if at all |
| **TC-PRIV-03** | Email content in logs | Truncated or omitted; reference ID only |
| **TC-PRIV-04** | DB backup encryption | Encrypted at rest; access controls |

---

## 7. Performance & Load Tests

### 7.1 Scheduler Performance

| Test ID | Load | Metric | Threshold |
|---------|------|--------|-----------|
| **TC-PERF-01** | 10,000 failed bookings | `processPaymentRetries` runtime | < 5 minutes |
| **TC-PERF-02** | 10,000 failed bookings | Memory usage | < 500MB stable |
| **TC-PERF-03** | 10,000 failed bookings | DB connections | Pool not exhausted (< 20) |
| **TC-PERF-04** | 1,000 webhooks/minute | Response time p95 | < 2 seconds |
| **TC-PERF-05** | 1,000 webhooks/minute | Error rate | < 0.1% |

### 7.2 Database Performance

| Test ID | Query | Load | Expected |
|---------|-------|------|----------|
| **TC-DB-01** | `processPaymentRetries` query | 100K bookings | Index used; < 5s execution |
| **TC-DB-02** | `monitorFlexibleBookings` query | 50K bookings | Efficient date range scan |
| **TC-DB-03** | Email count aggregation | Per booking | < 100ms |

---

## 8. Observability & Monitoring

### 8.1 Logging & Tracing

| Test ID | Event | Log Requirement |
|---------|-------|-----------------|
| **TC-LOG-01** | Any scheduler job start | `requestId`, job name, timestamp, input count |
| **TC-LOG-02** | Any scheduler job end | Summary: processed, failed, skipped, duration |
| **TC-LOG-03** | Payment state change | `bookingId`, `paymentId`, old→new state, reason |
| **TC-LOG-04** | Email send attempt | `emailType`, recipient (masked), status, error if failed |
| **TC-LOG-05** | External API call | URL, method, status code, duration, retry count |
| **TC-LOG-06** | Error condition | Full stack trace, `requestId`, context, severity |

### 8.2 Metrics & Alerting

| Metric | Type | Alert Condition |
|--------|------|-----------------|
| `payment_failed_total` | Counter | Increase > 10 in 1 hour |
| `payment_link_sent_total` | Counter | N/A (informational) |
| `scheduler_job_duration_seconds` | Histogram | p99 > 300 seconds |
| `email_failed_total` | Counter | Increase > 5 in 1 hour |
| `webhook_processing_duration_seconds` | Histogram | p99 > 5 seconds |
| `db_connection_pool_usage` | Gauge | > 80% of max |

---

## 9. Disaster Recovery & Business Continuity

### 9.1 Data Loss Scenarios

| Test ID | Scenario | Recovery |
|---------|----------|----------|
| **TC-DR-01** | Database backup restore to T-24h | Reconcile with Cloudbeds API; reprocess missing webhooks |
| **TC-DR-02** | Email table corrupted | Rebuild from logs; or accept partial data loss |
| **TC-DR-03** | Worker queue lost (ChargeTasks) | Re-create from Payment=PENDING records |
| **TC-DR-04** | Partial booking data | Guest can still pay via Cloudbeds directly; reconcile later |

### 9.2 Failover Tests

| Test ID | Component | Failover | Expected |
|---------|-----------|----------|----------|
| **TC-FAIL-01** | Primary DB | Read replica promotion | < 30s downtime; no data loss (sync replication) |
| **TC-FAIL-02** | SMTP primary | Secondary SMTP | Seamless switch; queue preserved |
| **TC-FAIL-03** | Application instance | Secondary instance | Load balancer routes; stateless app |

---

## 10. Manual Testing Checklist

For scenarios difficult to automate:

- [ ] **Visual email rendering**: Payment link email displays correctly in Gmail, Outlook, Apple Mail
- [ ] **Mobile payment flow**: Guest can complete payment on iOS Safari, Android Chrome
- [ ] **Timezone edge case**: Bookings during DST transition handled correctly
- [ ] **Real Cloudbeds payment link**: Generated link actually works in Cloudbeds sandbox
- [ ] **Admin email delivery**: Admin cancellation request reaches inbox (not spam)
- [ ] **Large property**: 500+ rooms, high booking volume — performance acceptable

---

## Test Environment Setup

### Required Mocks/Stubs

1. **Cloudbeds API**: Mock reservation fetch, payment link generation
2. **Payment Worker**: Simulate success/failure with configurable latency
3. **SMTP Server**: MailHog or Ethereal for email capture
4. **Time**: Freeze/forward time for testing resend windows

### Database Fixtures

```sql
-- Minimal test data
INSERT INTO "Booking" (id, "reservationId", "propertyId", "guestEmail", "totalAmount", "remainingBalance", "policyType", "startDate", "status")
VALUES 
  ('test-1', 'RES001', 'PROP001', 'guest@test.com', 100.00, 100.00, 'NON_REFUNDABLE', NOW() + INTERVAL '7 days', 'CREATED'),
  ('test-2', 'RES002', 'PROP001', NULL, 200.00, 200.00, 'FLEXIBLE', NOW() + INTERVAL '1 day', 'CREATED'),
  ('test-3', 'RES003', 'PROP001', 'guest@test.com', 50.00, 0.00, 'FLEXIBLE', NOW() + INTERVAL '3 days', 'CONFIRMED');
```

---

## Execution Matrix

| Environment | Frequency | Tests |
|-------------|-----------|-------|
| CI/CD | Every PR | TC-E2E-01, TC-RACE-01, TC-SEC-01, TC-PERF-04 (light) |
| Staging | Daily | All E2E, Integration, Security |
| Production | Weekly (smoke) | TC-E2E-01, TC-FAIL-01, TC-LOG-01 |
| Production | Monthly (full) | Complete regression suite |

---

**Last Updated**: 2026-04-05  
**Version**: 1.0 — Worker-First, Payment-Link Fallback Flow
