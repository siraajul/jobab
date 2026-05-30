import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateSettingsBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ApiAuthCookie, ApiAuthErrors, ApiInlineOk, ApiZodBody } from '../swagger/decorators';

@ApiTags('settings')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Read org settings + connected pages + product count',
    description:
      'Single payload powering the Settings page: shop name, AI instructions, connected ' +
      'Facebook / Instagram / WhatsApp pages, catalog source, and the live product count.',
  })
  @ApiInlineOk('Settings + page list + counters.', {
    id: 'cm0org123',
    name: 'Rongdhonu Boutique',
    aiInstructions: 'Reply in Bangla. Be warm. Never invent products.',
    notificationPhone: '+8801711000000',
    catalogSource: 'csv',
    productCount: 42,
    pages: [
      {
        id: 'cm0page1',
        platform: 'facebook',
        externalPageId: 'page_rongdhonu',
        status: 'connected',
        webhookSubscribed: true,
      },
    ],
    status: 'active',
  })
  async read(@OrgId() orgId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: { pages: true, _count: { select: { products: true } } },
    });
    return {
      id: org.id,
      name: org.name,
      aiInstructions: org.aiInstructions ?? '',
      notificationPhone: org.notificationPhone,
      catalogSource: org.catalogSource,
      productCount: org._count.products,
      pages: org.pages.map((p) => ({
        id: p.id,
        platform: p.platform,
        externalPageId: p.externalPageId,
        status: p.status,
        webhookSubscribed: p.webhookSubscribed,
      })),
      status: org.status,
    };
  }

  @Patch()
  @ApiOperation({
    summary: 'Update shop name and / or AI instructions',
    description:
      'Partial update — supply only what you want to change. Other settings (channels, ' +
      'pages, notification phone) have their own endpoints elsewhere.',
  })
  @ApiZodBody('UpdateSettingsBody', 'Fields to change.')
  @ApiInlineOk('The updated organisation row.', {
    id: 'cm0org123',
    name: 'Rongdhonu Boutique',
    aiInstructions: 'New instructions...',
  })
  async update(@OrgId() orgId: string, @Body() body: unknown) {
    const data = UpdateSettingsBodySchema.parse(body);
    return this.prisma.organization.update({ where: { id: orgId }, data });
  }
}
