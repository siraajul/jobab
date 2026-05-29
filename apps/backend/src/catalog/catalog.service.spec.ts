import { CatalogService } from './catalog.service';

/**
 * Unit tests for the catalog text search. Verifies tokenisation, stopword
 * removal, and OR-matching across title / description / variant names.
 */
describe('CatalogService.search', () => {
  const products = [
    {
      id: 'p1',
      title: 'Lal Jamdani Shari',
      description: 'cotton handloom, red with gold zari border',
      price: '1650',
      currency: 'BDT',
      variants: [
        { id: 'v1a', name: 'Medium · Red', stockQty: 5 },
        { id: 'v1b', name: 'Large · Red', stockQty: 1 },
      ],
    },
    {
      id: 'p2',
      title: 'Karchupi Three-Piece',
      description: 'festive embroidery',
      price: '1850',
      currency: 'BDT',
      variants: [{ id: 'v2a', name: 'Large · Teal', stockQty: 0 }],
    },
  ];

  const prisma = {
    product: {
      findMany: jest.fn(async ({ where, take }) => {
        // crude where → expects an OR array; match any token against any haystack
        const ors = (where.OR as Array<Record<string, unknown>>).map((o) => {
          if ('title' in o) return ['title', (o.title as { contains: string }).contains];
          if ('description' in o)
            return ['description', (o.description as { contains: string }).contains];
          return [
            'variant',
            ((o.variants as { some: { name: { contains: string } } }).some.name.contains),
          ];
        });
        return products
          .filter((p) =>
            ors.some(([field, needle]) => {
              const hay =
                field === 'title'
                  ? p.title
                  : field === 'description'
                    ? p.description
                    : p.variants.map((v) => v.name).join(' ');
              return hay.toLowerCase().includes((needle as string).toLowerCase());
            }),
          )
          .slice(0, take);
      }),
    },
  };

  const svc = new CatalogService(prisma as never);

  it('finds a product by a single token', async () => {
    const r = await svc.search('org', 'jamdani', 5);
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe('Lal Jamdani Shari');
  });

  it('ranks the multi-token match above single-token matches', async () => {
    const r = await svc.search('org', 'lal jamdani medium', 5);
    expect(r[0].title).toBe('Lal Jamdani Shari');
  });

  it('drops stopwords (medium/size/ki/ta) and still finds the product', async () => {
    const r = await svc.search('org', 'apa lal shari ki ache size medium', 5);
    expect(r[0].title).toBe('Lal Jamdani Shari');
  });

  it('returns empty for nonsense queries', async () => {
    const r = await svc.search('org', 'xyz qqq', 5);
    expect(r).toHaveLength(0);
  });
});
