import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogAdapter, CatalogProduct } from './catalog-adapter';
import { CsvAdapter } from './adapters/csv.adapter';
import { ShopifyAdapter } from './adapters/shopify.adapter';
import { WooAdapter } from './adapters/woo.adapter';
import { JinaEmbeddingProvider } from '../embeddings/jina.provider';

/**
 * Runs an adapter's `fetchAll` and upserts products + variants into the org.
 * Source-agnostic; the adapter handles the API differences. When the embedding
 * provider is configured, computes text + image vectors and stores them via
 * raw SQL (Prisma can't express the `vector` type directly).
 */
@Injectable()
export class CatalogSyncService {
  private readonly log = new Logger(CatalogSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: JinaEmbeddingProvider,
  ) {}

  adapterFor(source: 'csv' | 'shopify' | 'woocommerce'): CatalogAdapter {
    switch (source) {
      case 'csv':
        return new CsvAdapter();
      case 'shopify':
        return new ShopifyAdapter();
      case 'woocommerce':
        return new WooAdapter();
    }
  }

  async sync(
    organizationId: string,
    source: 'csv' | 'shopify' | 'woocommerce',
    credentials: unknown,
  ): Promise<{ products: number; variants: number; embeddings: number }> {
    const adapter = this.adapterFor(source);
    let productCount = 0;
    let variantCount = 0;
    let embeddingCount = 0;

    for await (const batch of adapter.fetchAll(credentials)) {
      for (const product of batch) {
        const productId = await this.upsertProduct(organizationId, product);
        productCount++;
        variantCount += product.variants.length;

        if (this.embeddings.available) {
          if (await this.embedAndStore(productId, product)) embeddingCount++;
        }
      }
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { catalogSource: source, status: 'active' },
    });

    this.log.log(
      `synced ${productCount} products / ${variantCount} variants / ${embeddingCount} embeddings from ${source}`,
    );
    return { products: productCount, variants: variantCount, embeddings: embeddingCount };
  }

  private async upsertProduct(organizationId: string, product: CatalogProduct): Promise<string> {
    const saved = await this.prisma.product.upsert({
      where: { organizationId_externalId: { organizationId, externalId: product.externalId } },
      update: {
        title: product.title,
        description: product.description,
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
      },
      create: {
        organizationId,
        externalId: product.externalId,
        title: product.title,
        description: product.description,
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
      },
    });

    for (const v of product.variants) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { productId: saved.id, sku: v.sku ?? v.externalId },
      });
      if (existing) {
        await this.prisma.productVariant.update({
          where: { id: existing.id },
          data: { name: v.name, price: v.price, stockQty: v.stockQty },
        });
      } else {
        await this.prisma.productVariant.create({
          data: {
            productId: saved.id,
            name: v.name,
            sku: v.sku ?? v.externalId,
            price: v.price,
            stockQty: v.stockQty,
          },
        });
      }
    }
    return saved.id;
  }

  /**
   * Compute text + image embeddings and persist via raw SQL (the `vector`
   * column type is `Unsupported` in Prisma). Returns true if at least one
   * embedding was stored.
   */
  private async embedAndStore(productId: string, product: CatalogProduct): Promise<boolean> {
    const textInput = [product.title, product.description].filter(Boolean).join(' — ');
    const [textVec, imageVec] = await Promise.all([
      textInput.length > 0 ? this.embeddings.embedText(textInput) : Promise.resolve(null),
      product.imageUrl ? this.embeddings.embedImage(product.imageUrl) : Promise.resolve(null),
    ]);

    let any = false;
    if (textVec) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE products SET text_embedding = $1::vector WHERE id = $2`,
        `[${textVec.join(',')}]`,
        productId,
      );
      any = true;
    }
    if (imageVec) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE products SET image_embedding = $1::vector WHERE id = $2`,
        `[${imageVec.join(',')}]`,
        productId,
      );
      any = true;
    }
    return any;
  }
}
