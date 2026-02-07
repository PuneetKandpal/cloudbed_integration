"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_VERSION = void 0;
exports.createBaseEvent = createBaseEvent;
exports.EVENT_VERSION = '1.0';
function createBaseEvent(eventName, payload, source, correlationId) {
    return {
        version: exports.EVENT_VERSION,
        eventName,
        timestamp: new Date().toISOString(),
        correlationId,
        payload,
        source,
    };
}
//# sourceMappingURL=event.interface.js.map