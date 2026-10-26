import { Global, Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AccountRecoveryController } from './account-recovery.controller';
import { AccountRecoveryService } from './account-recovery.service';
import { MailService } from './mail.service';
import { AuthGuard } from './auth.guard';

@Global()
@Module({
  controllers: [AuthController, AccountRecoveryController],
  providers: [
    AuthService,
    AccountRecoveryService,
    MailService,
    SessionService,
    Reflector,
    AuthGuard,
    // Apply auth to every route by default; unguarded routes use @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
