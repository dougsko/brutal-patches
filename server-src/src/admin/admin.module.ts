import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BulkOperationsService } from './bulk-operations.service';
import { UsersModule } from '../users/users.module';
import { PatchModule } from '../patch/patch.module';

@Module({
  imports: [UsersModule, PatchModule],
  controllers: [AdminController],
  providers: [AdminService, BulkOperationsService],
  exports: [AdminService, BulkOperationsService],
})
export class AdminModule {}
