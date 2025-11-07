"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    app.use((0, cors_1.default)({ origin, credentials: true }));
    app.use((0, express_1.json)({ limit: '10mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '10mb' }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const port = Number(process.env.PORT || 4000);
    if (process.env.NODE_ENV !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('SMT API')
            .setDescription('API documentation for SMT')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        try {
            const document = swagger_1.SwaggerModule.createDocument(app, config);
            swagger_1.SwaggerModule.setup('api/docs', app, document);
        }
        catch (err) {
            try {
                const message = err?.message ?? String(err);
                console.warn('Swagger module failed to initialize:', message);
            }
            catch {
            }
        }
    }
    await app.listen(port);
}
void bootstrap().catch((e) => {
    console.error('Application bootstrap failed:', e);
    process.exit(1);
});
//# sourceMappingURL=main.js.map