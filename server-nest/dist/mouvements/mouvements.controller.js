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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MouvementsController = void 0;
const common_1 = require("@nestjs/common");
const mouvements_service_1 = require("./mouvements.service");
const common_2 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let MouvementsController = class MouvementsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(req, period, entrepriseId) {
        return this.service.list(req.user, period, entrepriseId ? Number(entrepriseId) : undefined);
    }
    async stats(req, period, entrepriseId) {
        const entId = entrepriseId ? Number(entrepriseId) : undefined;
        return this.service.stats(req.user, period, entId);
    }
    async getOne(id, req) {
        return this.service.getById(id, req.user);
    }
    async create(req, body, files) {
        const entrepriseIdRaw = body['entrepriseId'] ?? body['entreprise_id'];
        if (typeof entrepriseIdRaw !== 'undefined') {
            const entrepriseIdNum = Number(entrepriseIdRaw);
            if (!Number.isFinite(entrepriseIdNum) ||
                !Number.isInteger(entrepriseIdNum) ||
                entrepriseIdNum <= 0) {
                throw new common_1.BadRequestException('entrepriseId invalide');
            }
        }
        try {
            try {
                const rb = (req.body ?? {});
                console.debug('[mouvements.create] body keys:', Object.keys(rb).slice(0, 20));
                console.debug('[mouvements.create] files count:', Array.isArray(files) ? files.length : 0);
                if (Array.isArray(files)) {
                    console.debug('[mouvements.create] files sample:', files.slice(0, 3).map((f) => ({
                        originalname: f.originalname,
                        size: f.size,
                        mimetype: f.mimetype,
                        hasBuffer: !!f
                            .buffer,
                    })));
                }
            }
            catch {
            }
            if (files && files.length > 0) {
                return await this.service.createFromMultipart(req.body, files, req.user);
            }
            return await this.service.createFromBody(body, req.user);
        }
        catch (err) {
            try {
                const stack = err?.stack ?? String(err);
                console.error('[mouvements.create] error:', stack);
            }
            catch {
            }
            throw err;
        }
    }
    async update(id, req, body, files) {
        if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
            throw new common_1.BadRequestException('id invalide');
        }
        const entrepriseIdRaw = body['entrepriseId'] ?? body['entreprise_id'];
        if (typeof entrepriseIdRaw !== 'undefined') {
            const entrepriseIdNum = Number(entrepriseIdRaw);
            if (!Number.isFinite(entrepriseIdNum) ||
                !Number.isInteger(entrepriseIdNum) ||
                entrepriseIdNum <= 0) {
                throw new common_1.BadRequestException('entrepriseId invalide');
            }
        }
        try {
            try {
                const rb = (req.body ?? {});
                console.debug('[mouvements.update] body keys:', Object.keys(rb).slice(0, 20));
                console.debug('[mouvements.update] files count:', Array.isArray(files) ? files.length : 0);
            }
            catch {
            }
            if (files && files.length > 0) {
                return await this.service.updateFromMultipart(id, req.body, files, req.user);
            }
            return await this.service.update(id, body, req.user);
        }
        catch (err) {
            try {
                const stack = err?.stack ?? String(err);
                console.error('[mouvements.update] error:', stack);
            }
            catch {
            }
            throw err;
        }
    }
    async remove(id, req) {
        return this.service.remove(id, req.user);
    }
};
exports.MouvementsController = MouvementsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('entrepriseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MouvementsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('entrepriseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MouvementsController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_2.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], MouvementsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'ENTREPRISE'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', 10, {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Array]),
    __metadata("design:returntype", Promise)
], MouvementsController.prototype, "create", null);
__decorate([
    (0, common_2.Put)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'ENTREPRISE'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', 10, {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_2.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, Array]),
    __metadata("design:returntype", Promise)
], MouvementsController.prototype, "update", null);
__decorate([
    (0, common_2.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_2.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], MouvementsController.prototype, "remove", null);
exports.MouvementsController = MouvementsController = __decorate([
    (0, common_1.Controller)('api/mouvements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [mouvements_service_1.MouvementsService])
], MouvementsController);
//# sourceMappingURL=mouvements.controller.js.map