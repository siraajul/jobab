import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { ConnectPageBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { EncryptionService } from '../common/encryption/encryption.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Snapshot of where the merchant is in the onboarding flow. The UI drives a
   * checklist off this; once all three steps are `true` the org is ready.
   */
  @Get('status')
  @ApiOperation({ summary: 'Onboarding checklist status' })
  async status(@OrgId() orgId: string) {
    const [org, productCount, pageCount] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
      this.prisma.product.count({ where: { organizationId: orgId } }),
      this.prisma.page.count({ where: { organizationId: orgId } }),
    ]);
    return {
      pageConnected: pageCount > 0,
      catalogLoaded: productCount > 0,
      aiInstructionsSet: !!org.aiInstructions?.trim(),
      ready: pageCount > 0 && productCount > 0 && !!org.aiInstructions?.trim(),
      productCount,
      pageCount,
      catalogSource: org.catalogSource,
    };
  }

  @Post('pages')
  @ApiOperation({ summary: 'Connect a Facebook / Instagram / WhatsApp page' })
  async connectPage(@OrgId() orgId: string, @Body() body: unknown) {
    const { externalPageId, accessToken, platform } = ConnectPageBodySchema.parse(body);
    const encrypted = this.encryption.encrypt(accessToken);
    return this.prisma.page.upsert({
      where: {
        platform_externalPageId: { platform: platform as Platform, externalPageId },
      },
      update: { accessToken: encrypted, organizationId: orgId, status: 'connected' },
      create: {
        organizationId: orgId,
        platform: platform as Platform,
        externalPageId,
        accessToken: encrypted,
        status: 'connected',
        webhookSubscribed: false,
      },
    });
  }
}
