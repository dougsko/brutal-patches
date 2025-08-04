import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PatchController } from './patch/patch.controller';
import { PatchService } from './patch/patch.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController, PatchController],
  providers: [AppService, PatchService],
})
export class AppModule {}
