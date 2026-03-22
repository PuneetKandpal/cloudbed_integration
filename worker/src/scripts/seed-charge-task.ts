import { PrismaClient, ChargeTaskStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing required value: ${name}`);
  }
  return value.trim();
}

function parseAmount(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) {
    return '10';
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`Invalid amount: ${raw}`);
  }

  return String(num);
}

async function main(): Promise<void> {
  const reservationId = required(
    'RESERVATION_ID (or CLOUDBEDS_RESERVATION_ID)',
    process.env.RESERVATION_ID ?? process.env.CLOUDBEDS_RESERVATION_ID,
  );
  const propertyId = required(
    'PROPERTY_ID (or CLOUDBEDS_PROPERTY_ID)',
    process.env.PROPERTY_ID ?? process.env.CLOUDBEDS_PROPERTY_ID,
  );

  const currency = 'BHT';
  const amount = 10;

  const requestId = `seed_${Date.now()}`;

  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const booking = await prisma.booking.upsert({
    where: { reservationId },
    update: {
      propertyId,
      currency,
      updatedAt: new Date(),
    },
    create: {
      reservationId,
      propertyId,
      startDate,
      endDate,
      currency,
      totalAmount: amount,
      paidAmount: '0',
      remainingBalance: amount,
      rawPayload: {},
    },
    select: {
      id: true,
      reservationId: true,
      propertyId: true,
      currency: true,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      attemptNumber: 1,
    },
    select: { id: true },
  });

  const task = await prisma.chargeTask.create({
    data: {
      bookingId: booking.id,
      paymentId: payment.id,
      reservationId,
      propertyId,
      amount,
      currency,
      status: ChargeTaskStatus.PENDING,
      scheduledFor: new Date(),
      requestId,
    },
    select: { id: true, status: true, scheduledFor: true },
  });

  console.log('Seeded ChargeTask for worker');
  console.log(
    JSON.stringify(
      {
        booking,
        paymentId: payment.id,
        chargeTask: task,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
