-- Extend OrderStatus with shipped + delivered. Postgres-safe enum mutation.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'shipped';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'delivered';
