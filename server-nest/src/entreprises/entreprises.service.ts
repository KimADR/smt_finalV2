import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateEntrepriseDto,
  UpdateEntrepriseDto,
} from './dto/create-entreprise.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EntreprisesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * If entrepriseId is provided, return only that entreprise (used for ENTREPRISE role scoping).
   */
  findAll(entrepriseId?: number) {
    if (typeof entrepriseId === 'number' && Number.isFinite(entrepriseId)) {
      return this.prisma.entreprise.findMany({
        where: { id: Number(entrepriseId) },
      });
    }
    return this.prisma.entreprise.findMany();
  }

  async create(input: CreateEntrepriseDto) {
    const data: Prisma.EntrepriseCreateInput = {
      name: input.name,
      siret: input.siret,
      address: input.address,
      contactEmail: input.contactEmail,
      phone: input.phone,
      sector: input.sector,
      legalForm: input.legalForm,
      activity: input.activity,
      annualRevenue:
        input.annualRevenue !== undefined
          ? Number(input.annualRevenue)
          : undefined,
      city: input.city,
      postalCode: input.postalCode,
      description: input.description,
    } as Prisma.EntrepriseCreateInput;
    if (input.status) {
      data.status = input.status;
    }
    if (input.taxType) data.taxType = input.taxType;

    try {
      // If a userId is provided, run creation + user assignment in a transaction
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

      // no user assignment requested — simple create
      const created = await this.prisma.entreprise.create({ data });
      return created;
    } catch (err: unknown) {
      // Better error message for unique constraint on SIRET
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // You can inspect err.meta to find the target fields if needed
        throw new BadRequestException(
          'Une entreprise avec ce SIRET existe déjà.',
        );
      }
      const message = (err as { message?: string })?.message ?? String(err);
      throw new BadRequestException(message);
    }
  }

  async findOne(id: number) {
    const e = await this.prisma.entreprise.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Not found');
    return e;
  }

  async update(id: number, input: UpdateEntrepriseDto) {
    const data: Prisma.EntrepriseUpdateInput =
      {} as Prisma.EntrepriseUpdateInput;
    if (input.name !== undefined) data.name = input.name;
    if (input.siret !== undefined) data.siret = input.siret;
    if (input.address !== undefined) data.address = input.address;
    if (input.contactEmail !== undefined)
      data.contactEmail = input.contactEmail;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.sector !== undefined) data.sector = input.sector;
    if (input.annualRevenue !== undefined)
      data.annualRevenue = Number(input.annualRevenue);
    if (input.activity !== undefined) data.activity = input.activity;
    if (input.city !== undefined) data.city = input.city;
    if (input.postalCode !== undefined) data.postalCode = input.postalCode;
    if (input.description !== undefined) data.description = input.description;
    if (input.legalForm !== undefined) data.legalForm = input.legalForm;
    if (input.status) {
      data.status = input.status;
    }
    if (input.taxType) data.taxType = input.taxType;

    try {
      const updated = await this.prisma.entreprise.update({
        where: { id },
        data,
      });

      // Handle optional user reassignment. If input.userId is provided, we want to:
      // - clear entrepriseId from any previous user linked to this entreprise (if a different user is assigned)
      // - set entrepriseId on the new user (or clear if null)
      if (Object.prototype.hasOwnProperty.call(input, 'userId')) {
        // find previously assigned user (if any)
        const prev = await this.prisma.user.findFirst({
          where: { entrepriseId: id },
        });
        const prevId = prev ? prev.id : null;
        const newId = typeof input.userId === 'number' ? input.userId : null;

        // if prev exists and is different from newId, clear prev
        if (prevId && prevId !== newId) {
          try {
            await this.prisma.user.update({
              where: { id: prevId },
              data: { entrepriseId: null },
            });
          } catch (e) {
            console.error('Failed to clear previous user entrepriseId', e);
          }
        }

        // assign new user if newId is set
        if (newId) {
          try {
            await this.prisma.user.update({
              where: { id: newId },
              data: { entrepriseId: id },
            });
          } catch (e) {
            console.error('Failed to assign new user to entreprise', e);
          }
        }
      }

      return updated;
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? String(err);
      throw new BadRequestException(message);
    }
  }

  async remove(id: number) {
    await this.prisma.entreprise.delete({ where: { id } });
  }
}
