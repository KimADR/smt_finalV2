import { Controller, Get, Query, Res, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import type { Response } from 'express';
import { ReportsService, ListFiltersExport } from './reports.service';
import PDFDocument from 'pdfkit';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  list(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: AuthUser },
  ) {
    // basic validation moved into service; coerce incoming query to ListFilters shape
    const filters = {
      ...(query as Record<string, any>),
    } as unknown as ListFiltersExport;

    return this.service.list(filters, req.user as AuthUser | undefined);
  }

  @Get('pdf')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  async exportPdf(
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
    @Req() req: Request & { user?: AuthUser },
  ) {
    try {
      const filters = {
        ...(query as Record<string, any>),
        limit: 10000,
      } as unknown as ListFiltersExport & { limit?: number };

      const rows = await this.service.listAll(
        filters,
        req.user as AuthUser | undefined,
      );
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="reports-${new Date().toISOString().slice(0, 10)}.pdf"`,
      );
      doc.pipe(res);

      // page geometry
      const left = doc.page?.margins?.left ?? 40;
      const right = doc.page?.margins?.right ?? 40;
      const top = doc.page?.margins?.top ?? 40;
      const bottom = doc.page?.margins?.bottom ?? 40;
      const pageWidth = (doc.page?.width ?? 595) - left - right;
      const pageHeight = doc.page?.height ?? 842;

      // columns (in points)
      const colDateW = 70;
      // make entreprise smaller to give description more room
      const colEntrepriseW = 120;
      // compact montant width; left-aligned
      const colMontantW = 90;
      const colDescW =
        pageWidth - (colDateW + colEntrepriseW + colMontantW) - 10;

      let pageNum = 1;

      const headerY = () => top;

      const parseAmount = (v: any) => {
        // Robust parse: keep sign and digits only (handles inputs like "-900 /000 MGA" or "32 000 /000")
        if (typeof v === 'number' && !Number.isNaN(v)) return v;
        if (v == null) return 0;
        let s = String(v).toString();
        // remove currency label and slashes
        s = s.replace(/mga/gi, '');
        s = s.replace(/\//g, '');
        // detect leading minus
        const isNeg = s.trim().startsWith('-');
        // keep only digits
        const digits = s.replace(/[^0-9]/g, '') || '0';
        const n = parseInt(digits, 10) || 0;
        return isNeg ? -n : n;
      };

      const formatWithDots = (num: number) => {
        // use fr-FR formatting (NBSP) then replace NBSP/space with dot
        const r = new Intl.NumberFormat('fr-FR', {
          maximumFractionDigits: 0,
        }).format(num);
        return r.replace(/\u202F|\s/g, '.');
      };

      const drawVisualHeader = () => {
        // Title
        doc
          .fontSize(16)
          .fillColor('#111827')
          .font('Helvetica-Bold')
          .text('Rapport SMT', left, headerY(), { align: 'left' });
        doc.moveDown(0.2);

        // Draw a light rectangle for column headers
        const y = doc.y + 6;
        doc.save();
        doc.rect(left - 6, y - 6, pageWidth + 12, 26).fill('#f3f4f6');
        doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold');
        // headings positions
        const xDate = left;
        const xEntreprise = xDate + colDateW + 8;
        const xMontant = xEntreprise + colEntrepriseW + 8;
        const xDesc = xMontant + colMontantW + 8;
        doc.text('Date', xDate, y, { width: colDateW, align: 'left' });
        doc.text('Entreprise', xEntreprise, y, {
          width: colEntrepriseW,
          align: 'left',
        });
        // left-align montant so it starts at the same left edge as other columns
        doc.text('Montant', xMontant, y, { width: colMontantW, align: 'left' });
        doc.text('Description', xDesc, y, { width: colDescW, align: 'left' });

        // draw column separators
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
        // move cursor below header
        doc
          .moveTo(left, y + 24)
          .strokeColor('#e5e7eb')
          .lineWidth(0.5)
          .stroke();
        doc.y = y + 28;
      };

      // start first page header
      drawVisualHeader();

      const usableBottom = pageHeight - bottom - 20; // leave room for footer

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

        // compute heights for wrapped text (date is two lines: dateTop and timeBottom)
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

        // if not enough space, add page and draw header
        if (doc.y + rowHeight > usableBottom) {
          // draw footer for previous page
          try {
            doc
              .fontSize(8)
              .fillColor('#6b7280')
              .text(`Page ${pageNum}`, left, pageHeight - bottom + 6, {
                align: 'right',
                width: pageWidth,
              });
          } catch (e) {
            console.error(e);
          }
          doc.addPage();
          pageNum++;
          drawVisualHeader();
        }

        const y = doc.y;

        // draw alternating background
        if (rowIndex % 2 === 0) {
          doc.save();
          doc
            .rect(left - 6, y - 2, pageWidth + 12, rowHeight + 4)
            .fill('#ffffff');
          doc.restore();
        }

        // draw vertical separators for the table full height on this row area
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

        // write cells: date is two lines (dateTop then timeBottom)
        doc
          .fillColor('#111827')
          .font('Helvetica')
          .fontSize(10)
          .text(dateTop, xDate, y, { width: colDateW });
        // time on next line inside same cell
        doc
          .fontSize(9)
          .fillColor('#6b7280')
          .text(timeBottom, xDate, y + hDateTop, { width: colDateW });
        doc
          .fontSize(10)
          .fillColor('#111827')
          .text(entreprise, xEntreprise, y, { width: colEntrepriseW });
        if (entrepriseNif) {
          // NIF below the company name, muted smaller text
          doc
            .fontSize(9)
            .fillColor('#6b7280')
            .text(`NIF: ${entrepriseNif}`, xEntreprise, y + hEntName, {
              width: colEntrepriseW,
            });
        }
        // left-align montant to start at column left edge (more logical layout)
        doc.text(montant, xMontant, y, { width: colMontantW, align: 'left' });
        // truncate very long description to avoid runaway pages
        const maxDescLen = 2000;
        const desc =
          description.length > maxDescLen
            ? description.slice(0, maxDescLen) + '…'
            : description;
        doc.text(desc, xDesc, y, { width: colDescW });

        // draw horizontal separator line
        doc
          .moveTo(left - 6, y + rowHeight + 2)
          .lineTo(left - 6 + pageWidth + 12, y + rowHeight + 2)
          .strokeColor('#e5e7eb')
          .lineWidth(0.4)
          .stroke();

        // move cursor
        doc.y = y + rowHeight + 6;
        rowIndex++;
      }

      // final page footer
      try {
        doc
          .fontSize(8)
          .fillColor('#6b7280')
          .text(`Page ${pageNum}`, left, pageHeight - bottom + 6, {
            align: 'right',
            width: pageWidth,
          });
      } catch (e) {
        console.error(e);
      }

      doc.end();
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: String(err) });
      } else {
        try {
          res.end();
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}
