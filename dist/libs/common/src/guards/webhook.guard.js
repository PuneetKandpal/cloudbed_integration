"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookGuard = void 0;
const common_1 = require("@nestjs/common");
let WebhookGuard = class WebhookGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const signature = request.headers['x-webhook-signature'] ?? request.headers['x-cloudbeds-signature'];
        if (!signature) {
            throw new common_1.UnauthorizedException('Missing webhook signature');
        }
        return true;
    }
};
exports.WebhookGuard = WebhookGuard;
exports.WebhookGuard = WebhookGuard = __decorate([
    (0, common_1.Injectable)()
], WebhookGuard);
//# sourceMappingURL=webhook.guard.js.map