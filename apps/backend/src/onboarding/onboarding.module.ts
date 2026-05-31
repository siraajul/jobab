import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { FacebookOAuthService } from './facebook-oauth.service';
import { OAuthSessionStore } from './oauth-session.store';
import { TokenRotationService } from './token-rotation.service';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, FacebookOAuthService, OAuthSessionStore, TokenRotationService],
  exports: [FacebookOAuthService, TokenRotationService],
})
export class OnboardingModule {}
