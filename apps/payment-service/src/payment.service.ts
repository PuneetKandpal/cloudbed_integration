import { Injectable } from '@nestjs/common';

@Injectable()
export class MockPaymentService {
  charge(payload: {
    bookingId: string;
    amount: number;
  }) {
    // 🔁 Toggle behavior for demo
    if (payload.amount > 4000) {
      throw new Error('Mock payment failed: insufficient funds');
    }

    return {
      transactionId: 'TXN-' + Date.now(),
      status: 'SUCCESS',
    };
  }
}
