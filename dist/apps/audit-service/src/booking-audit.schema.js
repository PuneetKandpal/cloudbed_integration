"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingAuditSchema = void 0;
const mongoose_1 = require("mongoose");
exports.BookingAuditSchema = new mongoose_1.Schema({
    eventType: String,
    source: String,
    correlationId: String,
    guest: Object,
    booking: Object,
    payment: Object,
    pricing: Object,
    financial: Object,
    communications: Object,
    rawPayload: Object,
    timestamps: Object,
}, {
    strict: false,
});
//# sourceMappingURL=booking-audit.schema.js.map