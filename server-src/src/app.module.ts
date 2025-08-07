import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PatchController } from './patch/patch.controller';
import { PatchService } from './patch/patch.service';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { LoggerService } from './common/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [AppController, PatchController],
  providers: [
    AppService, 
    PatchService,
    LoggerService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, RateLimitMiddleware)
      .forRoutes('*');
  }
}
