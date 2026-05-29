'use client';

import { useEffect, useState } from 'react';
import { CatalogClient } from './CatalogClient';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    api.listProducts().then(setProducts).catch(() => setProducts([]));
  }, []);
  if (products === null) return null;
  return <CatalogClient initial={products} />;
}
