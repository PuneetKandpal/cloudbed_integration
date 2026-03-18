import path from 'node:path';
import { spawn } from 'node:child_process';

import dotenv from 'dotenv';
import { PaymentStatus, PrismaClient } from '@prisma/client';

import { LoggerService } from '../common/logger/logger.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type ChargeTaskData = {
  paymentId: string;
  bookingId: string;
  reservationId: string;
  propertyId: string;
  amount: number;
  currency: string;
  requestId?: string;
};

const logger = new LoggerService('PaymentChargeWorker');

function parseIntOr(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function runCloudbedsPlaywrightAutomation(params: {
  propertyId: string;
  reservationId: string;
  amount: number;
  currency: string;
  requestId: string;
}): Promise<{ success: boolean; error?: string }> {
  const timeoutMs = parseIntOr(process.env.PAYMENT_PLAYWRIGHT_TIMEOUT_MS, 4 * 60 * 1000);

  logger.logInfo(
    'Worker starting Cloudbeds Playwright automation',
    'PaymentChargeWorker',
    'runCloudbedsPlaywrightAutomation',
    params.requestId,
    {
      propertyId: params.propertyId,
      reservationId: params.reservationId,
      amount: params.amount,
      currency: params.currency,
      timeoutMs,
    },
  );

  return await new Promise((resolve) => {
    const child = spawn('npm', ['run', 'playwright:cloudbeds-login'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CLOUDBEDS_PROPERTY_ID: params.propertyId,
        CLOUDBEDS_RESERVATION_ID: params.reservationId,
        PAYMENT_AMOUNT: String(params.amount),
        PAYMENT_CURRENCY: params.currency,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    const timer = setTimeout(() => {
      logger.logWarn(
        'Cloudbeds Playwright automation timed out; killing process',
        'PaymentChargeWorker',
        'runCloudbedsPlaywrightAutomation',
        params.requestId,
        { timeoutMs },
      );

      child.kill('SIGKILL');
      resolve({ success: false, error: `Playwright automation timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk ?? '');
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ success: false, error: String(error) });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ success: true });
        return;
      }

      const trimmed = stderr.trim();
      resolve({
        success: false,
        error: trimmed ? trimmed.slice(-2000) : `Playwright script failed with exit code ${code}`,
      });
    });
  });
}

async function markTaskFailed(prisma: PrismaClient, params: { taskId: string; errorMessage: string }): Promise<void> {
  await prisma.scheduledTask.update({
    where: { id: params.taskId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorMessage: params.errorMessage,
    },
  });
}

async function processChargeTask(prisma: PrismaClient, task: { id: string; taskData: any }): Promise<void> {
  const workerRequestId = logger.generateRequestId();

  const payload = task.taskData as ChargeTaskData;

  logger.logInfo(
    'Worker picked up scheduled charge task',
    'PaymentChargeWorker',
    'processChargeTask',
    workerRequestId,
    {
      taskId: task.id,
      paymentId: payload?.paymentId,
      bookingId: payload?.bookingId,
      reservationId: payload?.reservationId,
      propertyId: payload?.propertyId,
      amount: payload?.amount,
      currency: payload?.currency,
      serverRequestId: payload?.requestId,
    },
  );

  if (
    !payload?.paymentId ||
    !payload?.bookingId ||
    !payload?.reservationId ||
    !payload?.propertyId ||
    typeof payload?.amount !== 'number' ||
    !payload?.currency
  ) {
    await markTaskFailed(prisma, {
      taskId: task.id,
      errorMessage: 'Invalid task payload for PAYMENT_CHARGE',
    });
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: payload.paymentId },
    select: { id: true, status: true },
  });

  if (!payment) {
    await markTaskFailed(prisma, {
      taskId: task.id,
      errorMessage: 'Payment not found for charge task',
    });
    return;
  }

  if (payment.status === PaymentStatus.CAPTURED) {
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    logger.logInfo(
      'Payment already captured; marking task complete',
      'PaymentChargeWorker',
      'processChargeTask',
      workerRequestId,
      { taskId: task.id, paymentId: payload.paymentId },
    );
    return;
  }

  const automationResult = await runCloudbedsPlaywrightAutomation({
    propertyId: payload.propertyId,
    reservationId: payload.reservationId,
    amount: payload.amount,
    currency: payload.currency,
    requestId: workerRequestId,
  });

  if (automationResult.success) {
    const transactionId = `CLOUDBEDS_UI_${Date.now()}`;

    await prisma.payment.update({
      where: { id: payload.paymentId },
      data: {
        status: PaymentStatus.CAPTURED,
        transactionId,
        processedAt: new Date(),
        errorMessage: null,
        gatewayResponse: {
          mode: 'playwright',
          workerRequestId,
          taskId: task.id,
          reservationId: payload.reservationId,
        },
      },
    });

    const booking = await prisma.booking.findUnique({
      where: { id: payload.bookingId },
      select: { totalAmount: true },
    });

    if (booking) {
      await prisma.booking.update({
        where: { id: payload.bookingId },
        data: {
          paidAmount: booking.totalAmount,
          remainingBalance: 0,
        },
      });
    }

    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        errorMessage: null,
      },
    });

    logger.logInfo(
      'Successfully captured payment via worker',
      'PaymentChargeWorker',
      'processChargeTask',
      workerRequestId,
      {
        taskId: task.id,
        paymentId: payload.paymentId,
        bookingId: payload.bookingId,
        reservationId: payload.reservationId,
        transactionId,
      },
    );

    return;
  }

  const errorMessage = automationResult.error || 'Playwright automation failed';

  await prisma.payment.update({
    where: { id: payload.paymentId },
    data: {
      status: PaymentStatus.FAILED,
      errorMessage,
      processedAt: new Date(),
      gatewayResponse: {
        mode: 'playwright',
        workerRequestId,
        taskId: task.id,
        reservationId: payload.reservationId,
        errorMessage,
      },
    },
  });

  await prisma.scheduledTask.update({
    where: { id: task.id },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorMessage,
    },
  });

  logger.logWarn(
    'Payment charge automation failed in worker',
    'PaymentChargeWorker',
    'processChargeTask',
    workerRequestId,
    {
      taskId: task.id,
      paymentId: payload.paymentId,
      reservationId: payload.reservationId,
      errorMessage,
    },
  );
}

async function claimAndProcessPendingTasks(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const batchSize = parseIntOr(process.env.PAYMENT_WORKER_BATCH_SIZE, 3);

  const tasks = await prisma.scheduledTask.findMany({
    where: {
      taskType: 'PAYMENT_CHARGE',
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: 'asc' },
    take: Math.max(1, batchSize),
    select: { id: true, taskData: true },
  });

  if (tasks.length === 0) return 0;

  let processed = 0;

  for (const task of tasks) {
    const claimAttempt = await prisma.scheduledTask.updateMany({
      where: { id: task.id, status: 'PENDING' },
      data: {
        status: 'IN_PROGRESS',
        executedAt: new Date(),
      },
    });

    if (claimAttempt.count === 0) continue;

    try {
      await processChargeTask(prisma, task);
    } catch (error) {
      const err = String(error);
      const requestId = logger.generateRequestId();
      logger.logError(
        'Unhandled error while processing charge task',
        'PaymentChargeWorker',
        'claimAndProcessPendingTasks',
        error,
        requestId,
        { taskId: task.id },
      );
      await markTaskFailed(prisma, { taskId: task.id, errorMessage: err });
    }

    processed += 1;
  }

  return processed;
}

async function main(): Promise<void> {
  const requestId = `payment-worker-${Date.now()}`;
  const prisma = new PrismaClient();

  const pollIntervalMs = parseIntOr(process.env.PAYMENT_WORKER_POLL_INTERVAL_MS, 2000);

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.logInfo(
      'Worker shutting down',
      'PaymentChargeWorker',
      'shutdown',
      requestId,
      { signal },
    );

    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  logger.logInfo(
    'Payment charge worker started',
    'PaymentChargeWorker',
    'main',
    requestId,
    {
      pollIntervalMs,
      batchSize: parseIntOr(process.env.PAYMENT_WORKER_BATCH_SIZE, 3),
    },
  );

  await prisma.$connect();

  while (!shuttingDown) {
    try {
      const processed = await claimAndProcessPendingTasks(prisma);

      if (processed > 0) {
        logger.logInfo(
          'Worker processed pending payment tasks',
          'PaymentChargeWorker',
          'main',
          requestId,
          { processed },
        );
      }
    } catch (error) {
      logger.logError(
        'Worker loop failed',
        'PaymentChargeWorker',
        'main',
        error,
        requestId,
      );
    }

    await new Promise((r) => setTimeout(r, Math.max(250, pollIntervalMs)));
  }
}

void main();
