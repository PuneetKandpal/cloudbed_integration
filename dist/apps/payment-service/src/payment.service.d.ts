export declare class MockPaymentService {
    charge(payload: {
        bookingId: string;
        amount: number;
    }): {
        transactionId: string;
        status: string;
    };
}
