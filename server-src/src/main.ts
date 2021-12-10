import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as cors from 'cors';
import 'dotenv/config';
import { fastifyHelmet } from 'fastify-helmet';
import { AppModule } from './app.module';

const port = process.env.PORT;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  await app.register(fastifyHelmet);
  const corstOpts = cors({ 
    origin: /cloudfront\.net$/
  });
  app.use(corstOpts)
  await app.listen(port);
  Logger.log(`Server started running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();