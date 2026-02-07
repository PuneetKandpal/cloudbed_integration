"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const rabbitmq_options_1 = require("./rabbitmq.options");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter());
    app.connectMicroservice((0, rabbitmq_options_1.getRabbitMQOptions)('payment-policy-service'));
    await app.startAllMicroservices();
    const port = 3008;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Booking Policy running on port 3008`);
}
bootstrap();
console.log(`🚀 Booking service running on port 3007`);
//# sourceMappingURL=main.js.map