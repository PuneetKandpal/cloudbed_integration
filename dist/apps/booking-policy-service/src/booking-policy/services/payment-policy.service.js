"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingPolicyService = void 0;
const common_1 = require("@nestjs/common");
let BookingPolicyService = class BookingPolicyService {
    evaluate(booking) {
        const now = new Date();
        const checkIn = new Date(booking.checkInDate);
        const hoursToCheckin = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (booking.policy === 'NON_REFUNDABLE') {
            return 'PAY_NOW';
        }
        if (booking.policy === 'FLEXIBLE' && hoursToCheckin <= 48) {
            return 'PAY_NOW';
        }
        return 'WAIT';
    }
};
exports.BookingPolicyService = BookingPolicyService;
exports.BookingPolicyService = BookingPolicyService = __decorate([
    (0, common_1.Injectable)()
], BookingPolicyService);
//# sourceMappingURL=payment-policy.service.js.map