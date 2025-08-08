import { Module } from '@nestjs/common';
import { PatchController } from './patch.controller';
import { PatchService } from './patch.service';
import { PatchRepository } from './patch.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [PatchService, PatchRepository],
  controllers: [PatchController],
  exports: [PatchService, PatchRepository],
})
export class PatchModule {}