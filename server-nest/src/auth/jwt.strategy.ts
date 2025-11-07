import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';

type JwtPayload = {
  sub: number;
  username: string;
  role: 'ADMIN_FISCAL' | 'AGENT_FISCAL' | 'ENTREPRISE';
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-me-dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    // Load user from DB to include entrepriseId and other details
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, entrepriseId: true },
    });
    if (!user) {
      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      entrepriseId: user.entrepriseId ?? null,
    };
  }
}
