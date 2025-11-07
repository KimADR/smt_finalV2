"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MouvementsModule = void 0;
const common_1 = require("@nestjs/common");
const mouvements_controller_1 = require("./mouvements.controller");
const mouvements_service_1 = require("./mouvements.service");
const prisma_service_1 = require("../prisma.service");
const alerts_module_1 = require("../alerts/alerts.module");
let MouvementsModule = class MouvementsModule {
};
exports.MouvementsModule = MouvementsModule;
exports.MouvementsModule = MouvementsModule = __decorate([
    (0, common_1.Module)({
        controllers: [mouvements_controller_1.MouvementsController],
        imports: [alerts_module_1.AlertsModule],
        providers: [mouvements_service_1.MouvementsService, prisma_service_1.PrismaService],
    })
], MouvementsModule);
//# sourceMappingURL=mouvements.module.js.map