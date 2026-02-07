"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter());
    const port = process.env.CLOUDBEDS_SERVICE_PORT ?? 3002;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Cloudbeds Integration Service running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map