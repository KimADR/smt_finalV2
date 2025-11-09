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
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    configService;
    constructor(configService) {
        const dbUrl = configService.get('DATABASE_URL');
        if (!dbUrl) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        super({
            datasources: {
                db: {
                    url: dbUrl,
                },
            },
        });
        this.configService = configService;
    }
    async onModuleInit() {
        const dbUrl = this.configService.get('DATABASE_URL');
        if (!dbUrl ||
            !(dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
            console.warn('Prisma not connected: missing or invalid DATABASE_URL. Set DATABASE_URL to a valid postgres URL to enable DB connections.');
            return;
        }
        let retries = 5;
        const retryDelay = 5000;
        while (retries > 0) {
            try {
                await this.$connect();
                console.log('Successfully connected to database');
                return;
            }
            catch (err) {
                retries--;
                console.log(`Failed to connect to database. Retries left: ${retries}`);
                console.error('Connection error:', err);
                if (retries === 0) {
                    console.error('Max retries reached. Could not connect to database.');
                    throw err;
                }
                await new Promise(resolve => setTimeout(resolve, retryDelay));
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
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map