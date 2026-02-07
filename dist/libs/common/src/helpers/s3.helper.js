"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuditLogKey = buildAuditLogKey;
function buildAuditLogKey(service, date) {
    return `audit/${service}/${date}.json`;
}
//# sourceMappingURL=s3.helper.js.map