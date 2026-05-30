import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { ConnectPageBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { EncryptionService } from '../common/encryption/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiInlineOk,
  ApiZodBody,
  ApiZodOk,
} from '../swagger/decorators';

@ApiTags('onboarding')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Onboarding checklist status',
    description:
      'Snapshot of where the merchant is in the connect-pages → catalog → AI-instructions flow. ' +
      'The dashboard renders a checklist off this; once all three are `true` the org is live.',
  })
  @ApiZodOk('OnboardingStatus', 'Booleans + supporting counters.')
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
  @ApiOperation({
    summary: 'Connect a Facebook / Instagram / WhatsApp page',
    description:
      'Upserts a `Page` row. The access token is encrypted at rest with `ENCRYPTION_KEY` so ' +
      'merchant credentials never appear in DB dumps in plaintext.',
  })
  @ApiZodBody('ConnectPageBody', 'Page ID + access token + platform.')
  @ApiInlineOk('The created or updated Page row.', {
    id: 'cm0page1',
    platform: 'facebook',
    externalPageId: 'page_rongdhonu',
    status: 'connected',
    webhookSubscribed: false,
  })
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
