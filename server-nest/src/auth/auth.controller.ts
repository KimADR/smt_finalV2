import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: { username?: string; email?: string; password: string }) {
    const usernameOrEmail = String(body?.email ?? body?.username ?? '');
    const password = String(body?.password ?? '');
    return this.auth.login(usernameOrEmail, password);
  }
}
