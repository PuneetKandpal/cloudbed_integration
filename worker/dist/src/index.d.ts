/**
 * =====================================================
 * CLOUDBED CHARGE WORKER - INDEPENDENT APPLICATION
 * =====================================================
 *
 * This is a completely separate application from the NestJS server.
 *
 * PURPOSE:
 * - Monitors the ChargeTask database table for pending payment charges
 * - Executes browser automation via Playwright to charge payments through Cloudbed UI
 * - Updates task and payment status back to the database
 *
 * WHY CRON INSTEAD OF setTimeout:
 * - Cron provides predictable, configurable scheduling (e.g., "every 30 seconds")
 * - Better for production: easy to adjust frequency without code changes
 * - Clear schedule visibility in logs and configuration
 * - Standard industry practice for periodic background jobs
 *
 * ARCHITECTURE:
 * - Express HTTP server for health checks and monitoring
 * - Cron job scheduler for periodic task processing
 * - Prisma client for database access (shared schema with main server)
 * - Spawns Playwright test process for browser automation
 *
 * WORKFLOW:
 * 1. Cron job triggers every N seconds (configured via CHARGE_WORKER_CRON_SCHEDULE)
 * 2. Query ChargeTask table for PENDING tasks
 * 3. Claim tasks (update to IN_PROGRESS) to prevent duplicate processing
 * 4. For each task:
 *    - Read reservation details (reservationId, propertyId, amount, currency)
 *    - Spawn Playwright subprocess with environment variables
 *    - Wait for automation to complete
 *    - Update Payment and ChargeTask status based on result
 * 5. Repeat on next cron trigger
 */
export {};
