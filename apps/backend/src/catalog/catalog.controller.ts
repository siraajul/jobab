import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CsvSyncBodySchema,
  SetVariantStockBodySchema,
  ShopifySyncBodySchema,
  WooSyncBodySchema,
} from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiInlineOk,
  ApiNotFound,
  ApiZodBody,
  ApiZodOk,
  ApiZodOkArray,
} from '../swagger/decorators';
import { CatalogSyncService } from './catalog-sync.service';

@ApiTags('catalog')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: CatalogSyncService,
  ) {}

  @Get('products')
  @ApiOperation({
    summary: 'List products in the org catalog',
    description:
      'Up to 200 products, most-recently-updated first. Pass `q` to filter by a fuzzy match ' +
      'against title and description.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Free-text filter against title / description.',
    required: false,
    example: 'jamdani',
  })
  @ApiZodOkArray('Product', 'Matching products with variants embedded.')
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
  @ApiOperation({ summary: 'Get one product with its variants' })
  @ApiParam({ name: 'id', description: 'Product ID.', example: 'cm0prod123' })
  @ApiZodOk('Product', 'The product with its variants array.')
  @ApiNotFound('Product')
  product(@OrgId() orgId: string, @Param('id') id: string) {
    return this.prisma.product.findFirstOrThrow({
      where: { id, organizationId: orgId },
      include: { variants: true },
    });
  }

  @Post('sync/csv')
  @ApiOperation({
    summary: 'Upsert products from a CSV string',
    description:
      'Send the raw CSV in the `csv` field. Expected columns: `sku,title,description,price,stockQty,imageUrl,color,size`. ' +
      'New SKUs are inserted; existing ones are updated.',
  })
  @ApiZodBody('CsvSyncBody', 'CSV blob (max ~5 MB).')
  @ApiInlineOk('Sync result counters.', { inserted: 42, updated: 8, skipped: 0, errors: [] })
  async syncCsv(@OrgId() orgId: string, @Body() body: unknown) {
    const { csv } = CsvSyncBodySchema.parse(body);
    return this.sync.sync(orgId, 'csv', { csv });
  }

  @Post('sync/shopify')
  @ApiOperation({
    summary: 'Sync the catalog from a Shopify store',
    description:
      'Connects via Shopify admin API and pulls every product + variant. The access token ' +
      'is encrypted at rest with `ENCRYPTION_KEY` before persistence.',
  })
  @ApiZodBody('ShopifySyncBody', 'Shop domain + admin API access token.')
  @ApiInlineOk('Sync result counters.', { inserted: 64, updated: 12, skipped: 0, errors: [] })
  syncShopify(@OrgId() orgId: string, @Body() body: unknown) {
    const creds = ShopifySyncBodySchema.parse(body);
    return this.sync.sync(orgId, 'shopify', creds);
  }

  @Post('sync/woocommerce')
  @ApiOperation({
    summary: 'Sync the catalog from a WooCommerce store',
    description: 'Uses the Woo REST API. Credentials are encrypted at rest.',
  })
  @ApiZodBody('WooSyncBody', 'Store URL + consumer key/secret.')
  @ApiInlineOk('Sync result counters.', { inserted: 30, updated: 5, skipped: 0, errors: [] })
  syncWoo(@OrgId() orgId: string, @Body() body: unknown) {
    const creds = WooSyncBodySchema.parse(body);
    return this.sync.sync(orgId, 'woocommerce', creds);
  }

  @Patch('variants/:id/stock')
  @ApiOperation({
    summary: 'Set on-hand stock for a variant',
    description:
      'Used when the merchant ticks something out of stock or restocks without re-uploading ' +
      'the whole catalog. The variant must belong to the active org (tenant isolation enforced).',
  })
  @ApiParam({ name: 'id', description: 'Variant ID.', example: 'cm0var123' })
  @ApiZodBody('SetVariantStockBody', 'New stock quantity (must be ≥ 0).')
  @ApiZodOk('ProductVariant', 'The updated variant.')
  @ApiNotFound('Variant')
  async setVariantStock(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { stockQty } = SetVariantStockBodySchema.parse(body);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, product: { organizationId: orgId } },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException('variant not found');
    return this.prisma.productVariant.update({
      where: { id },
      data: { stockQty },
    });
  }
}
