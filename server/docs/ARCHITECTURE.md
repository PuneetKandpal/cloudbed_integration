# System Architecture

## Overview

This system implements an automated booking payment workflow integrating Cloudbeds PMS with payment processing, risk assessment, and guest communications.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudbed PMS                            │
│                 (Webhook Events)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP POST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  NestJS Application                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Webhook Controller                         │  │
│  │  - Receives Cloudbed events                          │  │
│  │  - Validates payload                                 │  │
│  │  - Routes to services                                │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│                   ▼                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Booking Service                            │  │
│  │  - Creates/updates bookings                          │  │
│  │  - Evaluates booking policies                        │  │
│  │  - Triggers payment workflows                        │  │
│  └──┬────────────┬────────────┬────────────┬────────────┘  │
│     │            │            │            │                │
│     ▼            ▼            ▼            ▼                │
│  ┌─────┐    ┌────────┐   ┌──────┐    ┌────────┐           │
│  │Risk │    │Payment │   │Email │    │Cloudbed│           │
│  │Svc  │    │Service │   │Svc   │    │API Svc │           │
│  └─────┘    └────────┘   └──────┘    └────────┘           │
│                                                             │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              ▼                               ▼
    ┌──────────────────┐          ┌────────────────────┐
    │   PostgreSQL     │          │  External Services │
    │   Database       │          │  - Payment Gateway │
    │   (Prisma ORM)   │          │  - SMTP Server     │
    └──────────────────┘          │  - Cloudbed API    │
                                  └────────────────────┘
```

## Module Structure

### 1. Webhook Module
**Location**: `src/webhook/`

**Responsibilities**:
- Receive webhook events from Cloudbed
- Validate event payloads
- Route events to appropriate handlers
- Store raw webhook data in audit log

**Key Files**:
- `webhook.controller.ts` - HTTP endpoint handler
- `webhook.service.ts` - Event routing logic
- `cloudbed-webhook.dto.ts` - Data validation schemas

### 2. Booking Module
**Location**: `src/booking/`

**Responsibilities**:
- Manage booking lifecycle
- Evaluate booking policies (Flexible vs Non-Refundable)
- Determine payment timing
- Coordinate with other services

**Key Files**:
- `booking.service.ts` - Core booking logic
- `booking.module.ts` - Module definition

**Policy Evaluation**:
- Non-Refundable: Immediate payment required
- Flexible: Payment based on cancellation deadline
- Same-Day Check-in: Payment within 1 hour

### 3. Payment Module
**Location**: `src/payment/`

**Responsibilities**:

- Process payment authorizations
- Enqueue payment charge tasks for asynchronous processing
- Handle payment retries
- Track payment status
- Trigger manager approvals on failure

**Key Files**:
- `payment.service.ts` - Payment processing logic
- `payment.module.ts` - Module definition

**Retry Logic**:

- Attempt 1: Immediate enqueue
- Retries: hourly scheduler evaluates failed payments
- Risky bookings: retry after 2 hours
- Non-risky bookings: retry after 24 hours
- After configured failures: request admin cancellation (manual action)

### 3A. Payment Worker

**Location**: `../worker/`

**Responsibilities**:

- Poll `ChargeTask` records
- Execute Cloudbeds UI automation to charge payments
- Update `Payment` status to `CAPTURED` or `FAILED`

### 4. Risk Assessment Module
**Location**: `src/risk/`

**Responsibilities**:
- Evaluate booking risk factors
- Calculate risk scores
- Prioritize bookings for payment
- Flag high-risk reservations

**Risk Factors**:
- Same-day check-in: +50 points
- Next-day check-in: +30 points
- Multiple guests (>4): +20 points
- High value (>$500): +10 points

**Risk Levels**:
- LOW: 0-29 points
- MEDIUM: 30-49 points
- HIGH: 50-69 points
- CRITICAL: 70+ points

### 5. Email Module
**Location**: `src/email/`

**Responsibilities**:
- Send payment reminders
- Send payment links
- Send cancellation warnings
- Notify managers for approvals

**Email Types**:
- Payment Reminder
- Payment Link
- Cancellation Warning
- Manager Approval Request

### 6. Cloudbed API Module
**Location**: `src/cloudbed/`

**Responsibilities**:

- Fetch reservation details
- Fetch guest information
- Interface with Cloudbed REST API

### 7. Prisma Module
**Location**: `src/prisma/`

**Responsibilities**:

- Database connection management
- ORM client provisioning
- Transaction handling

### 8. Logger Service
**Location**: `src/common/logger/`

**Responsibilities**:

- Structured logging with Winston
- Daily log rotation
- 15-day retention policy
- Request ID tracking
- Detailed input/output logging

## Data Flow

### New Reservation Flow

1. **Webhook Receipt**
   - Cloudbed sends `reservation/created` event
   - Webhook controller receives and validates

2. **Booking Creation**
   - Booking service creates database record
   - Fetches full reservation from Cloudbed API
   - Determines booking policy type

3. **Risk Assessment**
   - Calculate risk score
   - Assign risk level
   - Set payment priority

4. **Payment Decision**
   - Non-Refundable → Immediate payment
   - Flexible → Check cancellation deadline
   - Same-Day → Immediate payment

5. **Payment Processing**
   - Authorize payment (creates `Payment` + enqueues `ChargeTask`)
   - Worker captures funds and marks `Payment` as `CAPTURED` or `FAILED`
   - Scheduler retries based on failed payments

6. **Notifications**
   - Payment confirmation email
   - Or payment reminder email
   - Manager alert if needed

### First Failure Escalation (Option A)

When a payment attempt fails and check-in is within 2 days:
- Always generate a Cloudbeds payment link
- Always email the link to the guest (if `guestEmail` exists)
- Always notify support
- Deduplicate using `Booking.escalatedAt`

### Check-In Flow

1. **Status Change Event**
   - Cloudbed sends `reservation/status_changed`
   - Status changes to `checked_in`

2. **Balance Check**
   - Verify remaining balance
   - If balance > 0 → Process payment

3. **Payment Processing**
   - Attempt to charge remaining balance
   - Send confirmation or failure email

## Database Schema

### Core Tables

**Booking**
- Stores reservation data
- Tracks policy type and status
- Links to all related entities

**Payment**
- Payment transaction records
- Retry tracking
- Status history

**RiskAssessment**
- Risk evaluation results
- Priority flags
- Risk factors

**Email**
- Email communication log
- Delivery status
- Message content

**AuditLog**
- System event tracking
- Full audit trail
- Request/response logging

## Environment Configuration

All sensitive data and configuration is externalized via environment variables:

- Database credentials
- API keys (Cloudbed, Payment Gateway)
- SMTP configuration
- Feature flags and thresholds
- Logging preferences

## Security Considerations

1. **API Keys**: Stored in environment variables, never committed
2. **Database**: Password-protected PostgreSQL with encrypted connections
3. **Payment Data**: Tokenized, never stored in plain text
4. **Audit Trail**: Complete logging of all operations
5. **Validation**: Strict input validation on all endpoints

## Scalability

**Current Architecture**: Monolithic application

**Scaling Options**:
1. Vertical: Increase server resources
2. Horizontal: Load balancer + multiple instances
3. Database: Connection pooling, read replicas
4. Async: Queue system for payment retries

**Future Considerations**:
- Redis for caching
- Message queue (RabbitMQ/AWS SQS)
- Separate worker processes
- Microservices decomposition

## Monitoring & Observability

**Logging**:
- Winston logger with daily rotation
- Structured JSON logs
- Request ID correlation
- 15-day retention

**Health Checks**:
- Database connectivity
- External API availability
- Queue processing status

**Metrics** (To implement):
- Payment success rates
- Average processing time
- Risk score distribution
- Email delivery rates

## Error Handling

**Strategy**: Fail gracefully with retry mechanisms

1. **Transient Errors**: Automatic retry with backoff
2. **Permanent Errors**: Log and escalate to manager
3. **Validation Errors**: Return clear error messages
4. **System Errors**: Alert monitoring system

## Deployment

**Recommended Stack**:
- **Application**: PM2 or Docker container
- **Database**: Managed PostgreSQL (AWS RDS, Azure Database)
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt or cloud provider
- **Monitoring**: CloudWatch, DataDog, or New Relic

## Testing Strategy

**Unit Tests**: Individual service methods
**Integration Tests**: Module interactions
**E2E Tests**: Complete workflows
**Load Tests**: Performance under load

## Maintenance

**Daily**: Monitor logs for errors
**Weekly**: Review payment failure rates
**Monthly**: Analyze risk assessment accuracy
**Quarterly**: Update dependencies and security patches
