"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter());
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const port = process.env.API_GATEWAY_PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 API Gateway running on port ${port}`);
    console.log(`📚 Health check available at http://localhost:${port}/api/health`);
}
bootstrap();
//# sourceMappingURL=main.js.map