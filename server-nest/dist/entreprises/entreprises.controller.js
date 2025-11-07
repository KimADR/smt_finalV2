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
exports.EntreprisesController = void 0;
const common_1 = require("@nestjs/common");
const entreprises_service_1 = require("./entreprises.service");
const create_entreprise_dto_1 = require("./dto/create-entreprise.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let EntreprisesController = class EntreprisesController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(req) {
        const user = req?.user;
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const entId = user.entrepriseId ?? user.entreprise?.id ?? null;
            if (entId)
                return this.service.findAll(Number(entId));
            return [];
        }
        return this.service.findAll();
    }
    create(dto) {
        return this.service.create(dto);
    }
    findOne(req, id) {
        const user = req.user;
        const entId = Number(id);
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const userEnt = user.entrepriseId ?? user.entreprise?.id ?? null;
            if (!userEnt || Number(userEnt) !== entId) {
                throw new common_1.ForbiddenException('Accès refusé');
            }
        }
        return this.service.findOne(Number(id));
    }
    update(id, dto) {
        return this.service.update(Number(id), dto);
    }
    async remove(id) {
        await this.service.remove(Number(id));
        return { ok: true };
    }
};
exports.EntreprisesController = EntreprisesController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EntreprisesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_entreprise_dto_1.CreateEntrepriseDto]),
    __metadata("design:returntype", void 0)
], EntreprisesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EntreprisesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_entreprise_dto_1.UpdateEntrepriseDto]),
    __metadata("design:returntype", void 0)
], EntreprisesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EntreprisesController.prototype, "remove", null);
exports.EntreprisesController = EntreprisesController = __decorate([
    (0, common_1.Controller)('api/entreprises'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [entreprises_service_1.EntreprisesService])
], EntreprisesController);
//# sourceMappingURL=entreprises.controller.js.map