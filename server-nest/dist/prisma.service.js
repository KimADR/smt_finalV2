"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    async onModuleInit() {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl ||
            !(dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
            console.warn('Prisma not connected: missing or invalid DATABASE_URL. Set DATABASE_URL to a valid postgres URL to enable DB connections.');
            return;
        }
        try {
            await this.$connect();
        }
        catch (err) {
            try {
                const message = err?.message ?? String(err);
                console.warn('Prisma failed to connect during onModuleInit:', message);
            }
            catch {
            }
        }
    }
    enableShutdownHooks(app) {
        this.$on('beforeExit', () => {
            void app.close().catch(() => {
            });
        });
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map