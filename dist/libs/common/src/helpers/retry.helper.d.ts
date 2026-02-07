export interface RetryOptions {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: 'linear' | 'exponential';
}
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
