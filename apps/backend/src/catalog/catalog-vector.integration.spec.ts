import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CatalogService } from './catalog.service';
import { JinaEmbeddingProvider } from '../embeddings/jina.provider';
import { PrismaService } from '../prisma/prisma.service';

const url = process.env.JOBAB_TEST_DATABASE_URL;
(url ? describe : describe.skip)(
  'Semantic catalog retrieval (real pgvector, synthetic vectors)',
  () => {
    const db = new PrismaClient({ datasources: url ? { db: { url } } : undefined });
    const vector = [1, ...Array(1023).fill(0)] as number[];
    const embeddings = { available: true, embedText: jest.fn(async () => vector) };
    const catalog = new CatalogService(
      db as PrismaService,
      embeddings as unknown as JinaEmbeddingProvider,
    );
    const orgIds: string[] = [];
    afterEach(async () => {
      await db.organization.deleteMany({ where: { id: { in: orgIds.splice(0) } } });
    });
    afterAll(async () => {
      await db.$disconnect();
    });

    it('retrieves semantically related products without keyword overlap and excludes other merchants', async () => {
      const own = await db.organization.create({ data: { name: `vector-${randomUUID()}` } });
      orgIds.push(own.id);
      const other = await db.organization.create({
        data: { name: `vector-other-${randomUUID()}` },
      });
      orgIds.push(other.id);
      const create = (organizationId: string) =>
        db.product.create({
          data: {
            organizationId,
            title: 'Festive cotton saree',
            price: 1200,
            variants: { create: { name: 'Red', price: 1200, stockQty: 3 } },
          },
        });
      const product = await create(own.id);
      const hidden = await create(other.id);
      for (const id of [product.id, hidden.id])
        await db.$executeRaw`
      UPDATE products SET text_embedding = ${JSON.stringify(vector)}::vector,
      text_embedding_model = 'jina-embeddings-v3:retrieval.passage:1024' WHERE id = ${id}`;
      const results = await catalog.search(own.id, 'বিয়ের পোশাক', 5);
      expect(results.map((result) => result.product_id)).toEqual([product.id]);
      expect(results[0].similarity).toBeCloseTo(1);
      expect(embeddings.embedText).toHaveBeenCalledWith('বিয়ের পোশাক', 'retrieval.query');
      const indexes = await db.$queryRaw<
        Array<{ indexname: string }>
      >`SELECT indexname FROM pg_indexes WHERE tablename = 'products'`;
      expect(indexes.map((index) => index.indexname)).toContain('products_text_embedding_hnsw');
    });

    it('rejects invalid dimensions and malformed vector values without executing SQL', async () => {
      await expect(catalog.searchByEmbedding('org', [1, 2], 5, 'text')).resolves.toEqual([]);
      await expect(
        catalog.searchByEmbedding('org', [Number.NaN, ...Array(1023).fill(0)], 5, 'text'),
      ).resolves.toEqual([]);
    });
  },
);
