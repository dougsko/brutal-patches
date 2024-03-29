import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { jwtConstants } from './auth/constants';
import { PatchController } from './patch/patch.controller';
import { PatchService } from './patch/patch.service';
import { UsersModule } from './users/users.module';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    AuthModule, 
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '7200s' },
    })
  ],
  controllers: [AppController, PatchController, AuthController ],
  providers: [
    AppService, 
    PatchService, 
    AuthService,
    UsersService
  ]
})
export class AppModule {}
