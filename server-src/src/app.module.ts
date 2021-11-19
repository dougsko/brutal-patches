import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PatchController } from './patch/patch.controller';
import { PatchService } from './patch/patch.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [],
  controllers: [AppController, PatchController, AuthController],
  providers: [AppService, PatchService, AuthService]
})
export class AppModule {}
