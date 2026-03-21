# Cloudbed Charge Worker

**Independent application for processing payment charges via browser automation**

## Overview

This is a **completely separate application** from the NestJS server. It monitors the `ChargeTask` database table and executes Playwright browser automation to charge payments through the Cloudbed UI.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│   NestJS Server     │         │   Charge Worker      │
│   (port 3000)       │         │   (port 3001)        │
└─────────────────────┘         └──────────────────────┘
         │                                │
         │ writes ChargeTask              │ reads ChargeTask
         ├────────────────────────────────┤
         │                                │
         │         Database               │
         │       (PostgreSQL)             │
         └────────────────────────────────┘
                      │
                      │ spawns
                      ▼
            ┌──────────────────┐
            │ Playwright Test  │
            │   (Browser)        │
            └──────────────────┘
```

## How It Works

1. **NestJS Server** creates a `ChargeTask` record when a payment needs to be charged
2. **Cron Job** triggers every 30 seconds (configurable) to check for pending tasks
3. **Worker** claims tasks (updates status to `IN_PROGRESS`)
4. **Playwright** subprocess is spawned to perform browser automation
5. **Database** is updated with results (payment captured or failed)

## Installation

```bash
cd worker
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database (must match main server)
DATABASE_URL="postgresql://user:password@localhost:5432/cloudbed_db"

# Worker settings
CHARGE_WORKER_PORT=3001
CHARGE_WORKER_CRON_SCHEDULE="*/30 * * * * *"  # Every 30 seconds
CHARGE_WORKER_BATCH_SIZE=3

# Playwright automation
PAYMENT_PLAYWRIGHT_TIMEOUT_MS=240000  # 4 minutes
CLOUDBEDS_PROPERTY_ID=317803
```

### Cron Schedule Format

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └── Day of Week (0-7, 0=Sunday)
│ │ │ │ └──── Month (1-12)
│ │ │ └────── Day of Month (1-31)
│ │ └──────── Hour (0-23)
│ └────────── Minute (0-59)
└──────────── Second (0-59)
```

Examples:
- `*/30 * * * * *` - Every 30 seconds
- `0 */5 * * * *` - Every 5 minutes
- `0 0 */1 * * *` - Every hour

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "tasksProcessed": 42,
  "tasksSucceeded": 40,
  "tasksFailed": 2,
  "lastRunAt": "2024-01-20T10:30:00.000Z",
  "cronJobRunning": false
}
```

### Detailed Status
```bash
curl http://localhost:3001/status
```

Response:
```json
{
  "queue": {
    "pending": 5,
    "inProgress": 1,
    "completed": 120,
    "failed": 3
  },
  "worker": {
    "uptime": 3600,
    "tasksProcessed": 42,
    "tasksSucceeded": 40,
    "tasksFailed": 2,
    "lastRunAt": "2024-01-20T10:30:00.000Z",
    "cronJobRunning": false
  }
}
```

## Why Cron Job Instead of setTimeout?

**Cron advantages:**
- ✅ Predictable, configurable scheduling (e.g., "every 30 seconds")
- ✅ Industry-standard for background jobs
- ✅ Easy to adjust frequency without code changes
- ✅ Clear schedule visibility in logs
- ✅ Better for production monitoring

**setTimeout drawbacks:**
- ❌ Manual implementation required
- ❌ Harder to configure and understand
- ❌ No standard format for schedules
- ❌ Must handle timing drift manually

## Logs

The worker provides detailed logging for all operations:

```
[INFO] [2024-01-20T10:30:00.000Z] Cron job triggered - checking for pending charge tasks
[INFO] [2024-01-20T10:30:01.000Z] Found 3 pending charge tasks, processing...
[INFO] [2024-01-20T10:30:02.000Z] Successfully claimed charge task
[INFO] [2024-01-20T10:30:03.000Z] Starting Playwright browser automation for charge
[INFO] [2024-01-20T10:35:12.000Z] Playwright automation completed successfully
[INFO] [2024-01-20T10:35:13.000Z] Payment charge completed successfully
```

## Troubleshooting

### Worker not processing tasks

1. Check database connection: `DATABASE_URL` in `.env`
2. Verify cron schedule is valid
3. Check worker logs for errors
4. Ensure Playwright test exists at `../tests/cloudbeds-login.spec.ts`

### Playwright automation failing

1. Check browser dependencies: `npx playwright install chromium`
2. Verify Cloudbed credentials are valid
3. Increase timeout: `PAYMENT_PLAYWRIGHT_TIMEOUT_MS`
4. Check Playwright logs in worker stderr

### Tasks stuck in IN_PROGRESS

- Worker crashed during processing
- Manually reset: `UPDATE ChargeTask SET status = 'PENDING' WHERE status = 'IN_PROGRESS'`

## Production Deployment

Use a process manager like PM2:

```bash
cd worker
npm run build

pm2 start dist/index.js --name cloudbed-charge-worker
pm2 save
pm2 startup
```

Or Docker:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY worker/package*.json ./
RUN npm ci --production
COPY worker/dist ./dist
CMD ["node", "dist/index.js"]
```
