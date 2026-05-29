import { CatalogAdapter, CatalogProduct } from '../catalog-adapter';

/**
 * CSV adapter. Many BD merchants have no store backend, so CSV is the
 * lowest-friction onboarding path. Expected columns:
 *   external_id,title,description,price,currency,image_url,
 *   variant_external_id,variant_name,sku,variant_price,stock_qty
 * Rows are grouped by external_id; each variant is a row.
 */
export class CsvAdapter implements CatalogAdapter {
  readonly source = 'csv' as const;

  async *fetchAll(credentials: { csv: string }): AsyncIterable<CatalogProduct[]> {
    const products = parseCsvToProducts(credentials.csv);
    // Single batch — CSVs are small.
    yield products;
  }
}

export function parseCsvToProducts(csv: string): CatalogProduct[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitRow(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const byId = new Map<string, CatalogProduct>();
  for (let i = 1; i < lines.length; i++) {
    const row = splitRow(lines[i]);
    const externalId = row[idx('external_id')] ?? '';
    if (!externalId) continue;
    let product = byId.get(externalId);
    if (!product) {
      product = {
        externalId,
        title: row[idx('title')] ?? '',
        description: row[idx('description')] || undefined,
        price: Number(row[idx('price')] ?? 0),
        currency: row[idx('currency')] || 'BDT',
        imageUrl: row[idx('image_url')] || undefined,
        variants: [],
      };
      byId.set(externalId, product);
    }
    product.variants.push({
      externalId: row[idx('variant_external_id')] ?? externalId,
      name: row[idx('variant_name')] ?? 'default',
      sku: row[idx('sku')] || undefined,
      price: Number(row[idx('variant_price')] ?? product.price),
      stockQty: Number(row[idx('stock_qty')] ?? 0),
    });
  }
  return Array.from(byId.values());
}

// Minimal CSV row splitter that handles quoted commas.
function splitRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}
