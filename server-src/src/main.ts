import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import 'dotenv/config';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { corsConfig } from './common/config/cors.config';
import { LoggerService } from './common/logger.service';

const port = process.env.PORT || 4000;

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
    );

    // Get logger service
    const logger = app.get(LoggerService);
    
    // Security middleware
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.brutalpatches.com"],
        },
        reportOnly: process.env.NODE_ENV !== 'production',
      },
    });
    
    // CORS configuration
    app.enableCors(corsConfig);
    
    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      transform: true, // Transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }));

    // Start server
    await app.listen(port, '0.0.0.0');
    
    const startupMessage = `Server started running on http://localhost:${port}`;
    Logger.log(startupMessage, 'Bootstrap');
    logger.log(startupMessage, 'Bootstrap', {
      port,
      nodeEnv: process.env.NODE_ENV,
      cors: corsConfig.origin ? 'enabled' : 'disabled',
    });
  } catch (error) {
    Logger.error('Failed to bootstrap application', error.stack, 'Bootstrap');
    process.exit(1);
  }
}

bootstrap();
