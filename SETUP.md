# Setup Guide: Server + Worker Architecture

This application consists of **two independent applications**:

1. **NestJS Server** - Handles business logic, API endpoints, and enqueues payment tasks
2. **Worker** - Processes payment charges via Playwright browser automation

---

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Playwright browser dependencies
- Cloudbed credentials

---

## Initial Setup

### 1. Install Dependencies

```bash
# Install server dependencies
npm install

# Install worker dependencies (separate app)
npm run worker:install

# Install Playwright browsers
npx playwright install chromium
```

### 2. Database Setup

```bash
# Run Prisma migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cloudbed_db"

# Server
PORT=3000

# Cloudbed API
CLOUDBED_API_URL=https://api.cloudbeds.com
CLOUDBED_API_KEY=your_api_key
CLOUDBED_PROPERTY_ID=317803

# Payment (no PAYMENT_AUTOMATION_MODE needed - worker is always used)
PAYMENT_SERVER_WAIT_TIMEOUT_MS=600000
PAYMENT_SERVER_POLL_INTERVAL_MS=2000
```

**Worker configuration** (uses same `.env` file):
```env
# Worker settings
CHARGE_WORKER_PORT=3001
CHARGE_WORKER_CRON_SCHEDULE="*/30 * * * * *"
CHARGE_WORKER_BATCH_SIZE=3
PAYMENT_PLAYWRIGHT_TIMEOUT_MS=240000
```

---

## Running the Applications

### Development Mode

**Terminal 1 - NestJS Server:**
```bash
npm run start:dev
```

**Terminal 2 - Worker:**
```bash
npm run worker:dev
```

### Production Mode

```bash
# Build both applications
npm run build
npm run worker:build

# Start server
npm run start:prod

# Start worker (in separate terminal or process manager)
npm run worker:start
```

---

## How It Works

### Payment Flow

```
1. Webhook arrives → NestJS Server creates Booking
2. Scheduler or API → Server.authorizePayment()
3. Server creates Payment + ChargeTask (status: PENDING)
4. Server waits for result by polling ChargeTask
                          ↓
5. Worker cron job (every 30s) checks for PENDING tasks
6. Worker claims task → status: IN_PROGRESS
7. Worker spawns: npm run playwright:cloudbeds-login
8. Playwright logs into Cloudbed UI, authorizes payment
9. Worker updates:
   - Payment (status: CAPTURED, transactionId)
   - Booking (paidAmount, remainingBalance)
   - ChargeTask (status: COMPLETED)
                          ↓
10. Server receives result from ChargeTask poll
11. Returns success/failure to caller
```

### Database Tables

- **`Booking`** - Reservation data from webhook
- **`Payment`** - Payment attempts and results
- **`ChargeTask`** - Worker queue (read by worker, polled by server)

### Key Points

✅ **Server and Worker are completely independent**
- Different package.json files
- Different node_modules
- Different processes
- Only share database connection

✅ **No direct communication between server and worker**
- Server writes to `ChargeTask` table
- Worker reads from `ChargeTask` table
- Server polls `ChargeTask` for results

✅ **Worker uses cron for scheduling**
- Predictable intervals (e.g., every 30 seconds)
- Configurable via `CHARGE_WORKER_CRON_SCHEDULE`
- Better for production than setTimeout loops

---

## Monitoring

### Server Health
```bash
curl http://localhost:3000/health
```

### Worker Health
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

### Worker Queue Status
```bash
curl http://localhost:3001/status
```

---

## Troubleshooting

### Worker not processing tasks

1. Check worker is running: `curl http://localhost:3001/health`
2. Check database connection in worker logs
3. Verify cron schedule: `CHARGE_WORKER_CRON_SCHEDULE`
4. Check ChargeTask table: `SELECT * FROM "ChargeTask" WHERE status = 'PENDING'`

### Playwright automation failing

1. Check browser installed: `npx playwright install chromium`
2. Check Cloudbed credentials in `.env`
3. Increase timeout: `PAYMENT_PLAYWRIGHT_TIMEOUT_MS=300000`
4. Run test manually: `npm run playwright:cloudbeds-login`

### Tasks stuck in IN_PROGRESS

If worker crashes during processing:
```sql
-- Reset stuck tasks
UPDATE "ChargeTask" 
SET status = 'PENDING', "startedAt" = NULL 
WHERE status = 'IN_PROGRESS' 
AND "startedAt" < NOW() - INTERVAL '10 minutes';
```

---

## Production Deployment

### Using PM2

```bash
# Start server
pm2 start npm --name "cloudbed-server" -- run start:prod

# Start worker
pm2 start npm --name "cloudbed-worker" --cwd worker -- start

# Save configuration
pm2 save
pm2 startup
```

### Using Docker

See `docker-compose.yml` for multi-container setup with:
- Server container
- Worker container
- PostgreSQL database

---

## Architecture Benefits

### Why Separate Applications?

✅ **Independent Scaling**
- Run multiple worker instances for high load
- Scale server independently for API traffic

✅ **Isolation**
- Worker crashes don't affect server
- Server issues don't block payment processing

✅ **Clear Separation of Concerns**
- Server: Business logic, API, database writes
- Worker: Browser automation only

✅ **Easy Maintenance**
- Deploy server and worker independently
- Different dependencies and configurations
- Separate logs and monitoring

### Why Cron Instead of setTimeout?

✅ **Predictability** - "Every 30 seconds" is clearer than "setTimeout(30000)"
✅ **Configuration** - Change schedule without code changes
✅ **Industry Standard** - Everyone understands cron syntax
✅ **Monitoring** - Easy to see when jobs run
✅ **No Drift** - Cron handles timing accurately

---

## Next Steps

1. Configure Cloudbed credentials in `.env`
2. Test payment flow end-to-end
3. Set up monitoring/alerts for worker health
4. Configure cron schedule for production load
5. Set up log aggregation for both applications
