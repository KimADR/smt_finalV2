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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let AnalyticsController = class AnalyticsController {
    service;
    constructor(service) {
        this.service = service;
    }
    summary(period, entrepriseId, req) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug('[analytics.summary] req.user =', req?.user);
        }
        return this.service.summary(period, req?.user, entrepriseId ? Number(entrepriseId) : undefined);
    }
    monthly(months, period, entrepriseId, req) {
        return this.service.monthly(Number(months || 6), req?.user, period, entrepriseId ? Number(entrepriseId) : undefined);
    }
    sector(req) {
        return this.service.sector(req?.user);
    }
    taxCompliance(req) {
        return this.service.taxCompliance(req?.user);
    }
    cashflow(weeks, entrepriseId, req) {
        return this.service.cashflow(Number(weeks || 4), req?.user, entrepriseId ? Number(entrepriseId) : undefined);
    }
    topEnterprises(entrepriseId, req) {
        return this.service.topEnterprises(req?.user, entrepriseId ? Number(entrepriseId) : undefined);
    }
    alerts(period, entrepriseId, req) {
        return this.service.alerts(period, req?.user, entrepriseId ? Number(entrepriseId) : undefined);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('entrepriseId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('monthly'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Query)('months')),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('entrepriseId')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "monthly", null);
__decorate([
    (0, common_1.Get)('sector'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "sector", null);
__decorate([
    (0, common_1.Get)('tax-compliance'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "taxCompliance", null);
__decorate([
    (0, common_1.Get)('cashflow'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Query)('weeks')),
    __param(1, (0, common_1.Query)('entrepriseId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "cashflow", null);
__decorate([
    (0, common_1.Get)('top-enterprises'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Query)('entrepriseId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "topEnterprises", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('entrepriseId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "alerts", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('api/analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map