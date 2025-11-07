import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('api/debug')
export class DebugNotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get('notifications')
  async all() {
    // only allow in non-production for safety
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException();
    return this.prisma.notification.findMany({
      include: { alert: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
