"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("./logger.service");
let EmailService = class EmailService {
    constructor(logger) {
        this.logger = logger;
        this.logger.setContext('EmailService');
    }
    async send(to, subject, body) {
        this.logger.log(`Sending email to ${to} with subject: ${subject}`);
        console.log(`📧 EMAIL TO: ${to}`);
        console.log(`📧 SUBJECT: ${subject}`);
        console.log(`📧 BODY: ${body}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        this.logger.log(`Email sent successfully to ${to}`);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], EmailService);
//# sourceMappingURL=email.service.js.map