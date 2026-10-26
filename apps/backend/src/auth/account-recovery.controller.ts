import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ForgotPasswordBodySchema, ResetPasswordBodySchema } from '@jobab/shared';
import type { Response } from 'express';
import { CurrentUser, Public, type AuthenticatedContext } from './auth.guard';
import { AccountRecoveryService } from './account-recovery.service';
import { SESSION_COOKIE } from './session.service';
import { ApiZodBody } from '../swagger/decorators';

@ApiTags('auth')
@Controller('auth')
export class AccountRecoveryController {
  constructor(private readonly recovery: AccountRecoveryService) {}

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ long: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Email a one-time password reset link; response does not reveal account existence',
  })
  @ApiZodBody('ForgotPasswordBody', 'Account email.')
  request(@Body() body: unknown) {
    return this.recovery.request(ForgotPasswordBodySchema.parse(body).email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ long: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Consume a reset link and revoke all existing sessions' })
  @ApiZodBody('ResetPasswordBody', 'One-time token and new password.')
  reset(@Body() body: unknown) {
    const { token, password } = ResetPasswordBodySchema.parse(body);
    return this.recovery.reset(token, password);
  }

  @Post('revoke-sessions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign out every device, including this one' })
  async revoke(
    @CurrentUser() user: AuthenticatedContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.recovery.revokeSessions(user.userId);
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, path: '/', sameSite: 'lax' });
    res.clearCookie('jobab_org', { httpOnly: true, path: '/', sameSite: 'lax' });
    return result;
  }
}
