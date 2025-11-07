"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
const ALLOWED_ROLES = ['ENTREPRISE', 'ADMIN_FISCAL', 'AGENT_FISCAL'];
function isRole(v) {
    return (typeof v === 'string' && ALLOWED_ROLES.includes(v));
}
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(filter) {
        const where = {};
        if (filter?.entrepriseId !== undefined) {
            where.entrepriseId = filter.entrepriseId;
        }
        return this.prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                phone: true,
                avatar: true,
                role: true,
                isActive: true,
                createdAt: true,
                entrepriseId: true,
                entreprise: { select: { id: true, name: true } },
            },
        });
    }
    async create(input) {
        const username = typeof input.username === 'string' ? input.username : undefined;
        const email = typeof input.email === 'string' ? input.email : undefined;
        const rawPassword = typeof input.password === 'string' ? input.password : undefined;
        if (!username || !email || !rawPassword)
            throw new common_1.BadRequestException('username, email and password are required');
        const hashed = await bcrypt.hash(String(rawPassword), 10);
        const roleStr = typeof input.role === 'string' ? input.role : 'ENTREPRISE';
        const roleEnum = isRole(roleStr) ? roleStr : 'ENTREPRISE';
        const phone = typeof input.phone === 'string' ? input.phone : undefined;
        const fullName = typeof input.fullName === 'string' ? input.fullName : undefined;
        const avatar = typeof input.avatar === 'string' ? input.avatar : undefined;
        try {
            return await this.prisma.user.create({
                data: {
                    username,
                    email,
                    password: hashed,
                    role: roleEnum,
                    phone,
                    fullName,
                    avatar,
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    avatar: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            });
        }
        catch (err) {
            const message = err?.message ?? String(err);
            throw new common_1.BadRequestException(message);
        }
    }
    async get(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                phone: true,
                avatar: true,
                role: true,
                isActive: true,
                createdAt: true,
                entrepriseId: true,
                entreprise: { select: { id: true, name: true } },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        return user;
    }
    async update(id, input) {
        const data = {};
        if (input.username)
            data.username = input.username;
        if (input.email)
            data.email = input.email;
        if (input.password)
            data.password = await bcrypt.hash(String(input.password), 10);
        if (input.phone)
            data.phone = input.phone;
        if (input.fullName)
            data.fullName = input.fullName;
        if (input.avatar)
            data.avatar = input.avatar;
        if (input.role) {
            const r = input.role;
            data.role = isRole(r) ? r : 'ENTREPRISE';
        }
        if (Object.prototype.hasOwnProperty.call(input, 'entrepriseId')) {
            data.entrepriseId =
                input.entrepriseId === null ? null : input.entrepriseId;
        }
        try {
            return await this.prisma.user.update({
                where: { id },
                data,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    avatar: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            });
        }
        catch (err) {
            const message = err?.message ?? String(err);
            throw new common_1.BadRequestException(message);
        }
    }
    async remove(id) {
        await this.prisma.user.delete({ where: { id } });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map