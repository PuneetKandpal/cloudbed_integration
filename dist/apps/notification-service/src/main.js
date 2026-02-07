"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const rabbitmq_options_1 = require("./rabbitmq.options");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter());
    app.connectMicroservice((0, rabbitmq_options_1.getRabbitMQOptions)('notification-service'));
    await app.startAllMicroservices();
    const port = process.env.NOTIFICATION_SERVICE_PORT ?? 3004;
    await app.listen(port, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map