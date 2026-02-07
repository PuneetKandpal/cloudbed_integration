"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationId = void 0;
const common_1 = require("@nestjs/common");
exports.CorrelationId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.correlationId;
});
//# sourceMappingURL=correlation-id.decorator.js.map