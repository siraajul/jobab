import { z } from 'zod';

export const ProductVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  price: z.union([z.string(), z.number()]),
  stockQty: z.number().int().nonnegative(),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  externalId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  price: z.union([z.string(), z.number()]),
  currency: z.string(),
  imageUrl: z.string().nullable(),
  updatedAt: z.string(),
  variants: z.array(ProductVariantSchema),
});
export type Product = z.infer<typeof ProductSchema>;

export const CsvSyncBodySchema = z.object({
  csv: z.string().min(1).max(2_000_000),
});
export type CsvSyncBody = z.infer<typeof CsvSyncBodySchema>;

export const ShopifySyncBodySchema = z.object({
  shop: z.string().min(1),
  accessToken: z.string().min(1),
});
export type ShopifySyncBody = z.infer<typeof ShopifySyncBodySchema>;

export const WooSyncBodySchema = z.object({
  siteUrl: z.string().url(),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
});
export type WooSyncBody = z.infer<typeof WooSyncBodySchema>;
