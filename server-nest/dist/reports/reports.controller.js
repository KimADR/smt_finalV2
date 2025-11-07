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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let ReportsController = class ReportsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(query, req) {
        const filters = {
            ...query,
        };
        return this.service.list(filters, req.user);
    }
    async exportPdf(query, res, req) {
        try {
            const filters = {
                ...query,
                limit: 10000,
            };
            const rows = await this.service.listAll(filters, req.user);
            const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reports-${new Date().toISOString().slice(0, 10)}.pdf"`);
            doc.pipe(res);
            const left = doc.page?.margins?.left ?? 40;
            const right = doc.page?.margins?.right ?? 40;
            const top = doc.page?.margins?.top ?? 40;
            const bottom = doc.page?.margins?.bottom ?? 40;
            const pageWidth = (doc.page?.width ?? 595) - left - right;
            const pageHeight = doc.page?.height ?? 842;
            const colDateW = 70;
            const colEntrepriseW = 120;
            const colMontantW = 90;
            const colDescW = pageWidth - (colDateW + colEntrepriseW + colMontantW) - 10;
            let pageNum = 1;
            const headerY = () => top;
            const parseAmount = (v) => {
                if (typeof v === 'number' && !Number.isNaN(v))
                    return v;
                if (v == null)
                    return 0;
                let s = String(v).toString();
                s = s.replace(/mga/gi, '');
                s = s.replace(/\//g, '');
                const isNeg = s.trim().startsWith('-');
                const digits = s.replace(/[^0-9]/g, '') || '0';
                const n = parseInt(digits, 10) || 0;
                return isNeg ? -n : n;
            };
            const formatWithDots = (num) => {
                const r = new Intl.NumberFormat('fr-FR', {
                    maximumFractionDigits: 0,
                }).format(num);
                return r.replace(/\u202F|\s/g, '.');
            };
            const drawVisualHeader = () => {
                doc
                    .fontSize(16)
                    .fillColor('#111827')
                    .font('Helvetica-Bold')
                    .text('Rapport SMT', left, headerY(), { align: 'left' });
                doc.moveDown(0.2);
                const y = doc.y + 6;
                doc.save();
                doc.rect(left - 6, y - 6, pageWidth + 12, 26).fill('#f3f4f6');
                doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold');
                const xDate = left;
                const xEntreprise = xDate + colDateW + 8;
                const xMontant = xEntreprise + colEntrepriseW + 8;
                const xDesc = xMontant + colMontantW + 8;
                doc.text('Date', xDate, y, { width: colDateW, align: 'left' });
                doc.text('Entreprise', xEntreprise, y, {
                    width: colEntrepriseW,
                    align: 'left',
                });
                doc.text('Montant', xMontant, y, { width: colMontantW, align: 'left' });
                doc.text('Description', xDesc, y, { width: colDescW, align: 'left' });
                doc.lineWidth(0.6).strokeColor('#e5e7eb');
                const sepX1 = xDate + colDateW + 4;
                const sepX2 = xEntreprise + colEntrepriseW + 4;
                const sepX3 = xMontant + colMontantW + 4;
                doc
                    .moveTo(sepX1, y - 6)
                    .lineTo(sepX1, y + 20)
                    .stroke();
                doc
                    .moveTo(sepX2, y - 6)
                    .lineTo(sepX2, y + 20)
                    .stroke();
                doc
                    .moveTo(sepX3, y - 6)
                    .lineTo(sepX3, y + 20)
                    .stroke();
                doc.restore();
                doc
                    .moveTo(left, y + 24)
                    .strokeColor('#e5e7eb')
                    .lineWidth(0.5)
                    .stroke();
                doc.y = y + 28;
            };
            drawVisualHeader();
            const usableBottom = pageHeight - bottom - 20;
            let rowIndex = 0;
            for (const r of rows) {
                const rawDate = r.date ?? '';
                const dateObj = new Date(rawDate);
                const dateTop = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('fr-FR')
                    : String(rawDate).split('T')[0] || String(rawDate);
                const timeBottom = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })
                    : String(rawDate).split('T')[1] || '';
                const entreprise = String(r.entrepriseName || '');
                const entrepriseNif = String(r.entrepriseNif ?? '') || '';
                const montantRaw = parseAmount(r.amount ?? 0);
                const montant = `${formatWithDots(montantRaw)} MGA`;
                const description = String(r.description || '');
                const xDate = left;
                const xEntreprise = xDate + colDateW + 8;
                const xMontant = xEntreprise + colEntrepriseW + 8;
                const xDesc = xMontant + colMontantW + 8;
                const hDateTop = doc.heightOfString(dateTop, { width: colDateW });
                const hTimeBottom = doc.heightOfString(timeBottom, { width: colDateW });
                const hDateTotal = hDateTop + hTimeBottom;
                const hEntName = doc.heightOfString(entreprise, {
                    width: colEntrepriseW,
                });
                const hEntNif = entrepriseNif
                    ? doc.heightOfString(`NIF: ${entrepriseNif}`, {
                        width: colEntrepriseW,
                    })
                    : 0;
                const hEnt = hEntName + hEntNif;
                const hMont = doc.heightOfString(montant, { width: colMontantW });
                const hDesc = doc.heightOfString(description, { width: colDescW });
                const rowHeight = Math.max(hDateTotal, hEnt, hMont, hDesc) + 8;
                if (doc.y + rowHeight > usableBottom) {
                    try {
                        doc
                            .fontSize(8)
                            .fillColor('#6b7280')
                            .text(`Page ${pageNum}`, left, pageHeight - bottom + 6, {
                            align: 'right',
                            width: pageWidth,
                        });
                    }
                    catch (e) {
                        console.error(e);
                    }
                    doc.addPage();
                    pageNum++;
                    drawVisualHeader();
                }
                const y = doc.y;
                if (rowIndex % 2 === 0) {
                    doc.save();
                    doc
                        .rect(left - 6, y - 2, pageWidth + 12, rowHeight + 4)
                        .fill('#ffffff');
                    doc.restore();
                }
                doc.lineWidth(0.4).strokeColor('#e5e7eb');
                const sepX1 = xDate + colDateW + 4;
                const sepX2 = xEntreprise + colEntrepriseW + 4;
                const sepX3 = xMontant + colMontantW + 4;
                doc
                    .moveTo(sepX1, y - 2)
                    .lineTo(sepX1, y + rowHeight + 2)
                    .stroke();
                doc
                    .moveTo(sepX2, y - 2)
                    .lineTo(sepX2, y + rowHeight + 2)
                    .stroke();
                doc
                    .moveTo(sepX3, y - 2)
                    .lineTo(sepX3, y + rowHeight + 2)
                    .stroke();
                doc
                    .fillColor('#111827')
                    .font('Helvetica')
                    .fontSize(10)
                    .text(dateTop, xDate, y, { width: colDateW });
                doc
                    .fontSize(9)
                    .fillColor('#6b7280')
                    .text(timeBottom, xDate, y + hDateTop, { width: colDateW });
                doc
                    .fontSize(10)
                    .fillColor('#111827')
                    .text(entreprise, xEntreprise, y, { width: colEntrepriseW });
                if (entrepriseNif) {
                    doc
                        .fontSize(9)
                        .fillColor('#6b7280')
                        .text(`NIF: ${entrepriseNif}`, xEntreprise, y + hEntName, {
                        width: colEntrepriseW,
                    });
                }
                doc.text(montant, xMontant, y, { width: colMontantW, align: 'left' });
                const maxDescLen = 2000;
                const desc = description.length > maxDescLen
                    ? description.slice(0, maxDescLen) + '…'
                    : description;
                doc.text(desc, xDesc, y, { width: colDescW });
                doc
                    .moveTo(left - 6, y + rowHeight + 2)
                    .lineTo(left - 6 + pageWidth + 12, y + rowHeight + 2)
                    .strokeColor('#e5e7eb')
                    .lineWidth(0.4)
                    .stroke();
                doc.y = y + rowHeight + 6;
                rowIndex++;
            }
            try {
                doc
                    .fontSize(8)
                    .fillColor('#6b7280')
                    .text(`Page ${pageNum}`, left, pageHeight - bottom + 6, {
                    align: 'right',
                    width: pageWidth,
                });
            }
            catch (e) {
                console.error(e);
            }
            doc.end();
        }
        catch (err) {
            if (!res.headersSent) {
                res.status(500).json({ error: String(err) });
            }
            else {
                try {
                    res.end();
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('pdf'),
    (0, roles_decorator_1.Roles)('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportPdf", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('api/reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map