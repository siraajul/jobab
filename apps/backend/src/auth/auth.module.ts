import { Global, Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AuthGuard } from './auth.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    Reflector,
    AuthGuard,
    // Apply auth to every route by default; unguarded routes use @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
