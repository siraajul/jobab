import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateSettingsBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Read org settings + connected pages + product count' })
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
  @ApiOperation({ summary: 'Update org name and/or AI instructions' })
  async update(@OrgId() orgId: string, @Body() body: unknown) {
    const data = UpdateSettingsBodySchema.parse(body);
    return this.prisma.organization.update({ where: { id: orgId }, data });
  }
}
