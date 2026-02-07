# Hostelworld – Event-driven NestJS Monorepo

Event-driven microservices for booking, payment, notification, and audit logging. Services communicate **only** via RabbitMQ; MongoDB holds operational state; AWS S3 is used for audit logs (audit-service only).

## Requirements

- **Node.js** >= 18
- **MongoDB** (for booking, cloudbeds, payment-policy, notification services)
- **RabbitMQ**
- **AWS S3** (for audit-service; bucket + credentials)

## Structure

```
hostelworld/
├── apps/
│   ├── booking-service           # Cloudbeds webhooks → booking events
│   ├── cloudbeds-integration-service  # Cloudbeds API → normalized events
│   ├── payment-policy-service    # Payment policy → success/failure events
│   ├── notification-service      # Channel-based (email, sms, push)
│   └── audit-service             # Consumes all events → S3 (no MongoDB)
├── libs/
│   ├── common                    # Logger, guards, interceptors, helpers, constants, decorators
│   ├── database                  # Mongo module (@nestjs/mongoose)
│   ├── shared-dtos               # Booking, payment, notification DTOs
│   └── shared-events             # Event interfaces + versioning
├── nest-cli.json
├── tsconfig.base.json
└── package.json
```

## Rules

- **Communication**: RabbitMQ only; no service-to-service HTTP or shared DB.
- **MongoDB**: Operational/state data per service; each service owns its schemas; audit-service does **not** use MongoDB.
- **Audit**: Only audit-service writes to S3 (JSON, append-only). Other services do not write audit logs.
- **Logging**: Application logs use `libs/common` logger; business/audit logs go through audit-service → S3.

## Setup

```bash
npm install
```

Configure environment (e.g. `.env` or process env):

- `MONGO_URI`, `RABBITMQ_URI`
- Per-service: `*_SERVICE_PORT`, `*_DB_NAME` where applicable
- Audit: `AUDIT_S3_BUCKET`, `AWS_REGION`, AWS credentials

## Build & run

```bash
# Build all
npm run build

# Build one app
npm run build:booking
npm run build:cloudbeds
npm run build:payment
npm run build:notification
npm run build:audit

# Run (default: booking-service)
npm run start

# Run a specific service
npm run start:booking
npm run start:cloudbeds
npm run start:payment
npm run start:notification
npm run start:audit

# Watch mode
npm run start:dev:booking
# ... etc.
```

## Event flow (scaffold)

- **booking-service**: Receives webhooks → persists booking state → publishes `booking.created` / `booking.updated` / `booking.cancelled`.
- **cloudbeds-integration-service**: Consumes booking/payment triggers → calls Cloudbeds API → publishes `cloudbeds.booking.received`, `cloudbeds.payment.received`.
- **payment-policy-service**: Consumes payment/booking events → applies policy → publishes `payment.success` / `payment.failure` / `payment.policy.decided`.
- **notification-service**: Consumes `notification.requested` → routes by channel (email, sms, push) → publishes `notification.sent` / `notification.failed`.
- **audit-service**: Consumes all of the above events → writes JSON audit log entries to S3 (no MongoDB).

RabbitMQ in production should use a topic/fanout exchange so audit-service’s queue receives all event types (bindings by routing key or pattern).

## Implementation status

- **Scaffold only**: Modules, providers, controllers, consumers, publishers, and schemas are in place with TODO comments.
- **No business logic** implemented; no UI.
- Add real logic in services, guards, and S3 append strategy (e.g. read–append–put or Kinesis Firehose) as needed.
