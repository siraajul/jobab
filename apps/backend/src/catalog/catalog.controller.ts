import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CsvSyncBodySchema,
  ShopifySyncBodySchema,
  WooSyncBodySchema,
} from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogSyncService } from './catalog-sync.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: CatalogSyncService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'List products in the org catalog' })
  async list(@OrgId() orgId: string, @Query('q') q?: string) {
    return this.prisma.product.findMany({
      where: {
        organizationId: orgId,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { description: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { variants: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get one product' })
  product(@OrgId() orgId: string, @Param('id') id: string) {
    return this.prisma.product.findFirstOrThrow({
      where: { id, organizationId: orgId },
      include: { variants: true },
    });
  }

  @Post('sync/csv')
  @ApiOperation({ summary: 'Upsert products from a CSV string' })
  async syncCsv(@OrgId() orgId: string, @Body() body: unknown) {
    const { csv } = CsvSyncBodySchema.parse(body);
    return this.sync.sync(orgId, 'csv', { csv });
  }

  @Post('sync/shopify')
  @ApiOperation({ summary: 'Sync the catalog from Shopify' })
  syncShopify(@OrgId() orgId: string, @Body() body: unknown) {
    const creds = ShopifySyncBodySchema.parse(body);
    return this.sync.sync(orgId, 'shopify', creds);
  }

  @Post('sync/woocommerce')
  @ApiOperation({ summary: 'Sync the catalog from WooCommerce' })
  syncWoo(@OrgId() orgId: string, @Body() body: unknown) {
    const creds = WooSyncBodySchema.parse(body);
    return this.sync.sync(orgId, 'woocommerce', creds);
  }
}
