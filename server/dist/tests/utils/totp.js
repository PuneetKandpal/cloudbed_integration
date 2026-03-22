"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTotp = generateTotp;
exports.resolveTotpCode = resolveTotpCode;
const node_crypto_1 = require("node:crypto");
function decodeBase32(value) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const sanitized = value.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
    let bits = '';
    for (const char of sanitized) {
        const index = alphabet.indexOf(char);
        if (index === -1) {
            throw new Error('Invalid TOTP secret format');
        }
        bits += index.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}
function generateTotp(secret, timeStepSeconds = 30, digits = 6) {
    const counter = Math.floor(Date.now() / 1000 / timeStepSeconds);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));
    const key = decodeBase32(secret);
    const digest = (0, node_crypto_1.createHmac)('sha1', key).update(counterBuffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binaryCode = ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);
    return String(binaryCode % 10 ** digits).padStart(digits, '0');
}
function resolveTotpCode() {
    const manualCode = process.env.CLOUDBEDS_TOTP_CODE?.trim();
    if (manualCode) {
        return manualCode;
    }
    const secret = process.env.CLOUDBEDS_TOTP_SECRET?.trim();
    if (!secret) {
        throw new Error('Set CLOUDBEDS_TOTP_SECRET for automatic 2FA or CLOUDBEDS_TOTP_CODE for a one-time manual run.');
    }
    return generateTotp(secret);
}
//# sourceMappingURL=totp.js.map