"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
async function withRetry(fn, options = {}) {
    const { maxAttempts = 3, delayMs = 1000 } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, delayMs * attempt));
            }
        }
    }
    throw lastError;
}
//# sourceMappingURL=retry.helper.js.map