import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { corsConfig } from './common/config/cors.config';
import { LoggerService } from './common/logger.service';

const port = process.env.PORT || 4000;

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Get logger service
    const logger = app.get(LoggerService);

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.brutalpatches.com'],
        },
        reportOnly: process.env.NODE_ENV !== 'production',
      },
    }));

    // CORS configuration
    app.enableCors(corsConfig);

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip properties not in DTO
        transform: true, // Transform payloads to DTO instances
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
        disableErrorMessages: process.env.NODE_ENV === 'production',
      }),
    );

    // Swagger API Documentation
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Brutal Patches API')
        .setDescription(
          'API documentation for Brutal Patches - Synthesizer Patch Management System',
        )
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .addServer('http://localhost:4000', 'Local development server')
        .addServer('https://api.brutalpatches.com', 'Production server')
        .addTag('Authentication', 'User authentication endpoints')
        .addTag('Users', 'User management endpoints')
        .addTag('Patches', 'Patch management endpoints')
        .addTag('Collections', 'Patch collection management')
        .addTag('Admin', 'Administrative endpoints')
        .addTag('Health', 'System health checks')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api-docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Brutal Patches API Documentation',
      });

      logger.log('Swagger documentation available at /api-docs', 'Bootstrap');
    }

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
