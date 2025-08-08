import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PatchModule } from './patch/patch.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './common/database/database.module';
import { CacheModule } from './common/cache/cache.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { LoggerService } from './common/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { MonitoringMiddleware } from './common/monitoring/monitoring.middleware';

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    MonitoringModule,
    AuthModule,
    UsersModule,
    PatchModule,
    HealthModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    LoggerService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MonitoringMiddleware, LoggerMiddleware, RateLimitMiddleware)
      .forRoutes('*');
  }
}
