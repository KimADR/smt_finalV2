import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(usernameOrEmail: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');
    if (!user.isActive) throw new BadRequestException('Compte inactif');
    return user;
  }

  async login(usernameOrEmail: string, password: string) {
    const user = await this.validateUser(usernameOrEmail, password);
    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = await this.jwt.signAsync(payload);
    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        role: user.role,
        entrepriseId: user.entrepriseId ?? null,
      },
    };
  }
}
