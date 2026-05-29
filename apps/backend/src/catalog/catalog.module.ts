import { Global, Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogSyncService } from './catalog-sync.service';

@Global()
@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogSyncService],
  exports: [CatalogService, CatalogSyncService],
})
export class CatalogModule {}
