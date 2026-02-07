"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toISOString = toISOString;
exports.parseISO = parseISO;
function toISOString(date) {
    return date.toISOString();
}
function parseISO(iso) {
    return new Date(iso);
}
//# sourceMappingURL=date.helper.js.map