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
exports.EntreprisesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
let EntreprisesService = class EntreprisesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(entrepriseId) {
        if (typeof entrepriseId === 'number' && Number.isFinite(entrepriseId)) {
            return this.prisma.entreprise.findMany({
                where: { id: Number(entrepriseId) },
            });
        }
        return this.prisma.entreprise.findMany();
    }
    async create(input) {
        const data = {
            name: input.name,
            siret: input.siret,
            address: input.address,
            contactEmail: input.contactEmail,
            phone: input.phone,
            sector: input.sector,
            legalForm: input.legalForm,
            activity: input.activity,
            annualRevenue: input.annualRevenue !== undefined
                ? Number(input.annualRevenue)
                : undefined,
            city: input.city,
            postalCode: input.postalCode,
            description: input.description,
        };
        if (input.status) {
            data.status = input.status;
        }
        if (input.taxType)
            data.taxType = input.taxType;
        try {
            if (typeof input.userId === 'number') {
                const created = await this.prisma.$transaction(async (tx) => {
                    const c = await tx.entreprise.create({ data });
                    await tx.user.update({
                        where: { id: input.userId },
                        data: { entrepriseId: c.id },
                    });
                    return c;
                });
                return created;
            }
            const created = await this.prisma.entreprise.create({ data });
            return created;
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002') {
                throw new common_1.BadRequestException('Une entreprise avec ce SIRET existe déjà.');
            }
            const message = err?.message ?? String(err);
            throw new common_1.BadRequestException(message);
        }
    }
    async findOne(id) {
        const e = await this.prisma.entreprise.findUnique({ where: { id } });
        if (!e)
            throw new common_1.NotFoundException('Not found');
        return e;
    }
    async update(id, input) {
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.siret !== undefined)
            data.siret = input.siret;
        if (input.address !== undefined)
            data.address = input.address;
        if (input.contactEmail !== undefined)
            data.contactEmail = input.contactEmail;
        if (input.phone !== undefined)
            data.phone = input.phone;
        if (input.sector !== undefined)
            data.sector = input.sector;
        if (input.annualRevenue !== undefined)
            data.annualRevenue = Number(input.annualRevenue);
        if (input.activity !== undefined)
            data.activity = input.activity;
        if (input.city !== undefined)
            data.city = input.city;
        if (input.postalCode !== undefined)
            data.postalCode = input.postalCode;
        if (input.description !== undefined)
            data.description = input.description;
        if (input.legalForm !== undefined)
            data.legalForm = input.legalForm;
        if (input.status) {
            data.status = input.status;
        }
        if (input.taxType)
            data.taxType = input.taxType;
        try {
            const updated = await this.prisma.entreprise.update({
                where: { id },
                data,
            });
            if (Object.prototype.hasOwnProperty.call(input, 'userId')) {
                const prev = await this.prisma.user.findFirst({
                    where: { entrepriseId: id },
                });
                const prevId = prev ? prev.id : null;
                const newId = typeof input.userId === 'number' ? input.userId : null;
                if (prevId && prevId !== newId) {
                    try {
                        await this.prisma.user.update({
                            where: { id: prevId },
                            data: { entrepriseId: null },
                        });
                    }
                    catch (e) {
                        console.error('Failed to clear previous user entrepriseId', e);
                    }
                }
                if (newId) {
                    try {
                        await this.prisma.user.update({
                            where: { id: newId },
                            data: { entrepriseId: id },
                        });
                    }
                    catch (e) {
                        console.error('Failed to assign new user to entreprise', e);
                    }
                }
            }
            return updated;
        }
        catch (err) {
            const message = err?.message ?? String(err);
            throw new common_1.BadRequestException(message);
        }
    }
    async remove(id) {
        await this.prisma.entreprise.delete({ where: { id } });
    }
};
exports.EntreprisesService = EntreprisesService;
exports.EntreprisesService = EntreprisesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EntreprisesService);
//# sourceMappingURL=entreprises.service.js.map