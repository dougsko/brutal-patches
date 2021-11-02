import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PatchController } from './patch/patch.controller';
import { PatchService } from './patch/patch.service';

@Module({
  imports: [],
  controllers: [AppController, PatchController],
  providers: [AppService, PatchService]
})
export class AppModule {}
