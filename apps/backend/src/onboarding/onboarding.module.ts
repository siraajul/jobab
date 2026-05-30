import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { FacebookOAuthService } from './facebook-oauth.service';
import { OAuthSessionStore } from './oauth-session.store';

@Module({
  controllers: [OnboardingController],
  providers: [FacebookOAuthService, OAuthSessionStore],
  exports: [FacebookOAuthService],
})
export class OnboardingModule {}
