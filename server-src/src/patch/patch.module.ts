import { Module } from '@nestjs/common';
import { PatchController } from './patch.controller';
import { PatchService } from './patch.service';
import { PatchRepository } from './patch.repository';
import { PatchVersionRepository } from './patch-version.repository';
import { PatchCollectionRepository } from './patch-collection.repository';
import { PatchCacheService } from './patch-cache.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [
    PatchService, 
    PatchRepository, 
    PatchVersionRepository, 
    PatchCollectionRepository,
    PatchCacheService
  ],
  controllers: [PatchController],
  exports: [
    PatchService, 
    PatchRepository, 
    PatchVersionRepository, 
    PatchCollectionRepository,
    PatchCacheService
  ],
})
export class PatchModule {}