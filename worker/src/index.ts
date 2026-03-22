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

import path from 'node:path';
import express, { type Request, type Response } from 'express';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { ChargeTaskStatus, PaymentStatus, PrismaClient } from '@prisma/client';
import { runCloudbedsChargeAutomation } from './automation/cloudbeds-charge';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Prisma client for database operations
 * Connects to the same database as the NestJS server
 */
const prisma = new PrismaClient();

/**
 * Statistics tracking for monitoring and health checks
 */
const stats = {
  startedAt: new Date(),
  tasksProcessed: 0,
  tasksSucceeded: 0,
  tasksFailed: 0,
  lastRunAt: null as Date | null,
  cronJobRunning: false,
};

/**
 * Parse integer from environment variable with fallback
 */
function parseIntOr(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Simple logger utility
 * In production, consider using a proper logging library
 */
const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] [${timestamp}] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] [${timestamp}] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  error: (message: string, error?: any, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] [${timestamp}] ${message}`, error, meta ? JSON.stringify(meta, null, 2) : '');
  },
};

/**
 * =====================================================
 * PLAYWRIGHT AUTOMATION EXECUTION
 * =====================================================
 * 
 * Directly executes Playwright browser automation (no subprocess).
 * 
 * PROCESS:
 * 1. Import automation flow from local tests/utils
 * 2. Launch browser with proper auth state
 * 3. Execute charge automation
 * 4. Return success/failure
 * 
 * All Playwright code is self-contained within the worker app.
 */
async function runCloudbedsPlaywrightAutomation(params: {
  propertyId: string;
  reservationId: string;
  amount: number;
  currency: string;
  taskId: string;
  requestId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const timeoutMs = parseIntOr(process.env.PAYMENT_PLAYWRIGHT_TIMEOUT_MS, 4 * 60 * 1000);

  logger.info('Starting Playwright browser automation for charge', {
    taskId: params.taskId,
    propertyId: params.propertyId,
    reservationId: params.reservationId,
    amount: params.amount,
    currency: params.currency,
    requestId: params.requestId,
    timeoutMs,
  });

  try {
    await Promise.race([
      runCloudbedsChargeAutomation({
        prisma,
        propertyId: params.propertyId,
        reservationId: params.reservationId,
        amount: params.amount,
        currency: params.currency,
        taskId: params.taskId,
        requestId: params.requestId,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Playwright automation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);

    logger.info('Playwright automation completed successfully', {
      taskId: params.taskId,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Playwright automation failed', error, {
      taskId: params.taskId,
      requestId: params.requestId,
      errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * =====================================================
 * TASK PROCESSING LOGIC
 * =====================================================
 */

/**
 * Mark a task as failed in the database
 */
async function markTaskFailed(params: { taskId: string; errorMessage: string }): Promise<void> {
  logger.warn('Marking charge task as FAILED', {
    taskId: params.taskId,
    errorMessage: params.errorMessage,
  });

  await prisma.chargeTask.update({
    where: { id: params.taskId },
    data: {
      status: ChargeTaskStatus.FAILED,
      completedAt: new Date(),
      errorMessage: params.errorMessage,
    },
  });
}

/**
 * Process a single charge task
 * 
 * STEPS:
 * 1. Validate payment record exists
 * 2. Check if already captured (idempotency)
 * 3. Run Playwright automation
 * 4. Update Payment and Booking records on success
 * 5. Mark task as COMPLETED or FAILED
 */
async function processChargeTask(task: {
  id: string;
  paymentId: string;
  bookingId: string;
  reservationId: string;
  propertyId: string;
  amount: any;
  currency: string;
  requestId: string | null;
}): Promise<void> {
  logger.info('Processing charge task', {
    taskId: task.id,
    paymentId: task.paymentId,
    bookingId: task.bookingId,
    reservationId: task.reservationId,
    propertyId: task.propertyId,
    amount: Number(task.amount),
    currency: task.currency,
  });

  // Step 1: Verify payment record exists
  const payment = await prisma.payment.findUnique({
    where: { id: task.paymentId },
    select: { id: true, status: true },
  });

  if (!payment) {
    logger.error('Payment record not found for charge task', null, {
      taskId: task.id,
      paymentId: task.paymentId,
    });
    await markTaskFailed({ taskId: task.id, errorMessage: 'Payment record not found' });
    return;
  }

  // Step 2: Check if payment already captured (idempotency protection)
  if (payment.status === PaymentStatus.CAPTURED) {
    logger.info('Payment already captured, marking task as complete', {
      taskId: task.id,
      paymentId: task.paymentId,
      paymentStatus: payment.status,
    });

    await prisma.chargeTask.update({
      where: { id: task.id },
      data: { status: ChargeTaskStatus.COMPLETED, completedAt: new Date() },
    });
    return;
  }

  // Step 3: Execute browser automation via Playwright
  logger.info('Executing browser automation to charge payment', {
    taskId: task.id,
    reservationId: task.reservationId,
  });

  const result = await runCloudbedsPlaywrightAutomation({
    propertyId: task.propertyId,
    reservationId: task.reservationId,
    amount: Number(task.amount),
    currency: task.currency,
    taskId: task.id,
    requestId: task.requestId,
  });

  // Step 4a: Handle SUCCESS - Update payment, booking, and task
  if (result.success) {
    const transactionId = `CLOUDBEDS_UI_${Date.now()}`;

    logger.info('Browser automation succeeded, updating database records', {
      taskId: task.id,
      paymentId: task.paymentId,
      transactionId,
    });

    // Update Payment record to CAPTURED
    await prisma.payment.update({
      where: { id: task.paymentId },
      data: {
        status: PaymentStatus.CAPTURED,
        transactionId,
        processedAt: new Date(),
        errorMessage: null,
        gatewayResponse: {
          mode: 'playwright',
          taskId: task.id,
          reservationId: task.reservationId,
        },
      },
    });

    // Update Booking record - mark as fully paid
    const booking = await prisma.booking.findUnique({
      where: { id: task.bookingId },
      select: { totalAmount: true },
    });

    if (booking) {
      await prisma.booking.update({
        where: { id: task.bookingId },
        data: { paidAmount: booking.totalAmount, remainingBalance: 0 },
      });
      logger.info('Updated booking as fully paid', {
        bookingId: task.bookingId,
        totalAmount: booking.totalAmount,
      });
    }

    // Mark charge task as COMPLETED
    await prisma.chargeTask.update({
      where: { id: task.id },
      data: { status: ChargeTaskStatus.COMPLETED, completedAt: new Date(), errorMessage: null },
    });

    stats.tasksSucceeded += 1;

    logger.info('Payment charge completed successfully', {
      taskId: task.id,
      paymentId: task.paymentId,
      bookingId: task.bookingId,
      transactionId,
    });
    return;
  }

  // Step 4b: Handle FAILURE - Update payment and task with error
  const errorMessage = result.error || 'Playwright automation failed';

  logger.error('Browser automation failed', null, {
    taskId: task.id,
    paymentId: task.paymentId,
    reservationId: task.reservationId,
    errorMessage,
  });

  // Update Payment record to FAILED
  await prisma.payment.update({
    where: { id: task.paymentId },
    data: {
      status: PaymentStatus.FAILED,
      errorMessage,
      processedAt: new Date(),
      gatewayResponse: {
        mode: 'playwright',
        taskId: task.id,
        reservationId: task.reservationId,
        errorMessage,
      },
    },
  });

  // Mark charge task as FAILED
  await markTaskFailed({ taskId: task.id, errorMessage });

  stats.tasksFailed += 1;
}

/**
 * =====================================================
 * CRON JOB TASK PROCESSOR
 * =====================================================
 * 
 * This function is triggered by the cron scheduler.
 * It claims pending tasks from the database and processes them.
 * 
 * WHY BATCH PROCESSING:
 * - Process multiple tasks per run for efficiency
 * - Configurable batch size via CHARGE_WORKER_BATCH_SIZE
 * - Prevents overwhelming the system with too many concurrent Playwright instances
 */
async function processPendingTasks(): Promise<void> {
  // Prevent concurrent runs if previous job still running
  if (stats.cronJobRunning) {
    logger.warn('Cron job skipped - previous job still running');
    return;
  }

  stats.cronJobRunning = true;
  stats.lastRunAt = new Date();

  try {
    const batchSize = parseIntOr(process.env.CHARGE_WORKER_BATCH_SIZE, 3);
    const now = new Date();

    logger.info('Cron job triggered - checking for pending charge tasks', { batchSize });

    // Query for PENDING tasks that are ready to execute
    const tasks = await prisma.chargeTask.findMany({
      where: {
        status: ChargeTaskStatus.PENDING,
        scheduledFor: { lte: now }, // Only tasks scheduled for now or earlier
      },
      orderBy: { scheduledFor: 'asc' }, // Process oldest first
      take: Math.max(1, batchSize),
      select: {
        id: true,
        paymentId: true,
        bookingId: true,
        reservationId: true,
        propertyId: true,
        amount: true,
        currency: true,
        requestId: true,
      },
    });

    if (tasks.length === 0) {
      logger.info('No pending tasks found');
      return;
    }

    logger.info(`Found ${tasks.length} pending charge tasks, processing...`, {
      taskIds: tasks.map((t) => t.id),
    });

    let processed = 0;

    // Process each task sequentially
    // Note: Tasks are processed one-at-a-time to avoid overwhelming browser resources
    for (const task of tasks) {
      try {
        // Claim the task (atomic update to prevent duplicate processing)
        const claimed = await prisma.chargeTask.updateMany({
          where: { id: task.id, status: ChargeTaskStatus.PENDING }, // Only if still PENDING
          data: { status: ChargeTaskStatus.IN_PROGRESS, startedAt: new Date() },
        });

        // If count is 0, another worker claimed it first - skip
        if (claimed.count === 0) {
          logger.warn('Task already claimed by another worker, skipping', { taskId: task.id });
          continue;
        }

        logger.info('Successfully claimed charge task', { taskId: task.id });

        // Process the task
        await processChargeTask(task);

        stats.tasksProcessed += 1;
        processed += 1;
      } catch (error) {
        logger.error('Unhandled error while processing charge task', error, { taskId: task.id });

        // Mark as failed to prevent stuck tasks
        await markTaskFailed({
          taskId: task.id,
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        stats.tasksFailed += 1;
        stats.tasksProcessed += 1;
        processed += 1;
      }
    }

    logger.info(`Cron job completed - processed ${processed} tasks`, {
      succeeded: stats.tasksSucceeded,
      failed: stats.tasksFailed,
    });
  } catch (error) {
    logger.error('Cron job encountered fatal error', error);
  } finally {
    stats.cronJobRunning = false;
  }
}

/**
 * =====================================================
 * MONITORING AND HEALTH CHECK ENDPOINTS
 * =====================================================
 */

/**
 * Get current task counts from database
 */
async function getTaskCounts(): Promise<{
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}> {
  const [pending, inProgress, completed, failed] = await Promise.all([
    prisma.chargeTask.count({ where: { status: ChargeTaskStatus.PENDING } }),
    prisma.chargeTask.count({ where: { status: ChargeTaskStatus.IN_PROGRESS } }),
    prisma.chargeTask.count({ where: { status: ChargeTaskStatus.COMPLETED } }),
    prisma.chargeTask.count({ where: { status: ChargeTaskStatus.FAILED } }),
  ]);
  return { pending, inProgress, completed, failed };
}

/**
 * =====================================================
 * MAIN APPLICATION ENTRY POINT
 * =====================================================
 */
async function main(): Promise<void> {
  logger.info('='.repeat(60));
  logger.info('CLOUDBED CHARGE WORKER STARTING');
  logger.info('='.repeat(60));

  const port = parseIntOr(process.env.CHARGE_WORKER_PORT, 3001);
  const cronSchedule = process.env.CHARGE_WORKER_CRON_SCHEDULE || '*/30 * * * * *'; // Default: every 30 seconds

  logger.info('Configuration loaded', {
    port,
    cronSchedule,
    batchSize: parseIntOr(process.env.CHARGE_WORKER_BATCH_SIZE, 3),
    playwrightTimeout: parseIntOr(process.env.PAYMENT_PLAYWRIGHT_TIMEOUT_MS, 4 * 60 * 1000),
  });

  // ===== EXPRESS HTTP SERVER =====
  const app = express();
  app.use(express.json());

  /**
   * Health check endpoint
   * Returns basic worker status and uptime
   */
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: Math.floor((Date.now() - stats.startedAt.getTime()) / 1000),
      tasksProcessed: stats.tasksProcessed,
      tasksSucceeded: stats.tasksSucceeded,
      tasksFailed: stats.tasksFailed,
      lastRunAt: stats.lastRunAt,
      cronJobRunning: stats.cronJobRunning,
    });
  });

  /**
   * Status endpoint
   * Returns detailed queue statistics
   */
  app.get('/status', async (_req: Request, res: Response) => {
    try {
      const counts = await getTaskCounts();
      res.json({
        queue: counts,
        worker: {
          uptime: Math.floor((Date.now() - stats.startedAt.getTime()) / 1000),
          tasksProcessed: stats.tasksProcessed,
          tasksSucceeded: stats.tasksSucceeded,
          tasksFailed: stats.tasksFailed,
          lastRunAt: stats.lastRunAt,
          cronJobRunning: stats.cronJobRunning,
        },
      });
    } catch (error) {
      logger.error('Error fetching status', error);
      res.status(500).json({ error: String(error) });
    }
  });

  const server = app.listen(port, () => {
    logger.info(`HTTP server listening on port ${port}`, {
      endpoints: ['GET /health', 'GET /status'],
    });
  });

  // ===== DATABASE CONNECTION =====
  logger.info('Connecting to database...');
  await prisma.$connect();
  logger.info('Database connected successfully');

  // ===== CRON JOB SCHEDULER =====
  logger.info('Starting cron job scheduler', { schedule: cronSchedule });

  const cronJob = cron.schedule(
    cronSchedule,
    () => {
      // This function executes on every cron trigger
      void processPendingTasks();
    },
    {
      scheduled: true, // Start immediately
      timezone: 'UTC', // Use UTC for consistency
    }
  );

  logger.info('Cron job scheduled successfully');
  logger.info('='.repeat(60));
  logger.info('WORKER READY - Monitoring ChargeTask table');
  logger.info('='.repeat(60));

  // ===== GRACEFUL SHUTDOWN =====
  const shutdown = async (signal: string) => {
    logger.info('Shutdown signal received', { signal });
    logger.info('Stopping cron job...');
    cronJob.stop();

    logger.info('Closing HTTP server...');
    server.close();

    logger.info('Disconnecting from database...');
    await prisma.$disconnect();

    logger.info('Worker shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

// Start the worker
void main().catch((error) => {
  logger.error('Fatal error during worker startup', error);
  process.exit(1);
});
