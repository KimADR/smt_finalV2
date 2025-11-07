import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import type { Prisma, Role } from '@prisma/client';

const ALLOWED_ROLES = ['ENTREPRISE', 'ADMIN_FISCAL', 'AGENT_FISCAL'] as const;

function isRole(v: unknown): v is Role {
  return (
    typeof v === 'string' && (ALLOWED_ROLES as readonly string[]).includes(v)
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter?: { entrepriseId?: number }) {
    const where: Prisma.UserWhereInput = {};
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

  async create(input: CreateUserDto) {
    const username =
      typeof input.username === 'string' ? input.username : undefined;
    const email = typeof input.email === 'string' ? input.email : undefined;
    const rawPassword =
      typeof input.password === 'string' ? input.password : undefined;
    if (!username || !email || !rawPassword)
      throw new BadRequestException(
        'username, email and password are required',
      );

    const hashed = await bcrypt.hash(String(rawPassword), 10);
    const roleStr = typeof input.role === 'string' ? input.role : 'ENTREPRISE';
    const roleEnum: Role = isRole(roleStr) ? roleStr : ('ENTREPRISE' as Role);
    const phone = typeof input.phone === 'string' ? input.phone : undefined;
    const fullName =
      typeof input.fullName === 'string' ? input.fullName : undefined;
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
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? String(err);
      throw new BadRequestException(message);
    }
  }

  async get(id: number) {
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
    if (!user) throw new NotFoundException('Not found');
    return user;
  }

  async update(id: number, input: UpdateUserDto) {
    const data: Prisma.UserUncheckedUpdateInput =
      {} as Prisma.UserUncheckedUpdateInput;
    if (input.username) data.username = input.username;
    if (input.email) data.email = input.email;
    if (input.password)
      data.password = await bcrypt.hash(String(input.password), 10);
    if (input.phone) data.phone = input.phone;
    if (input.fullName) data.fullName = input.fullName;
    if (input.avatar) data.avatar = input.avatar;
    if (input.role) {
      const r = input.role as unknown as string;
      data.role = isRole(r) ? r : 'ENTREPRISE';
    }

    // allow updating entrepriseId explicitly (including clearing with null)
    if (Object.prototype.hasOwnProperty.call(input, 'entrepriseId')) {
      // Prisma accepts null to clear the relation
      data.entrepriseId =
        input.entrepriseId === null ? null : (input.entrepriseId as number);
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
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? String(err);
      throw new BadRequestException(message);
    }
  }

  async remove(id: number) {
    await this.prisma.user.delete({ where: { id } });
  }
}
