import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedContext } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ApiAuthCookie, ApiAuthErrors, ApiInlineOk, ApiZodBody } from '../swagger/decorators';

const RegisterBody = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

@ApiTags('push')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('push')
export class PushController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('tokens')
  @ApiOperation({
    summary: 'Register a device push token (Expo / FCM / APNs)',
    description:
      'Upserts the token under the current user. Call this on app launch after permission ' +
      'is granted, and again whenever the token rotates.',
  })
  @ApiZodBody('RegisterPushTokenBody', 'Token + platform.')
  @ApiInlineOk('Stored token record.', {
    id: 'cm0tok1',
    userId: 'cm0user123',
    platform: 'ios',
    token: 'ExponentPushToken[xxxx]',
  })
  async register(@CurrentUser() user: AuthenticatedContext, @Body() body: unknown) {
    const { token, platform } = RegisterBody.parse(body);
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId: user.userId, platform: platform as DevicePlatform },
      create: { userId: user.userId, platform: platform as DevicePlatform, token },
    });
  }

  @Delete('tokens')
  @ApiOperation({
    summary: 'Unregister a device push token (sign-out)',
    description:
      'Deletes the row keyed by `token`. Call on sign-out so we stop trying to push to a ' +
      'device that is no longer authorised.',
  })
  @ApiZodBody('DeletePushTokenBody', 'Token to drop.')
  @ApiInlineOk('Deleted.', { ok: true })
  async deregister(@Body() body: unknown) {
    const { token } = z.object({ token: z.string().min(1) }).parse(body);
    await this.prisma.deviceToken.deleteMany({ where: { token } });
    return { ok: true };
  }
}
