import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedContext } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

const RegisterBody = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('tokens')
  @ApiOperation({ summary: 'Register a push token for the current user (Expo push / FCM / APNs)' })
  async register(@CurrentUser() user: AuthenticatedContext, @Body() body: unknown) {
    const { token, platform } = RegisterBody.parse(body);
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId: user.userId, platform: platform as DevicePlatform },
      create: { userId: user.userId, platform: platform as DevicePlatform, token },
    });
  }

  @Delete('tokens')
  @ApiOperation({ summary: 'Unregister a push token (sign-out)' })
  async deregister(@Body() body: unknown) {
    const { token } = z.object({ token: z.string().min(1) }).parse(body);
    await this.prisma.deviceToken.deleteMany({ where: { token } });
    return { ok: true };
  }
}
