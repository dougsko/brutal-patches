import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Context, Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { AppModule } from './app.module';
import express = require('express');
import cors = require('cors');

let cachedHandler: any;

async function bootstrapServer() {
  if (!cachedHandler) {
    const expressApp = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    nestApp.use(cors());
    nestApp.enableCors({
      origin: 'https://brutalpatches.com',
    });
    await nestApp.init();
    cachedHandler = serverlessExpress({ app: expressApp });
  }
  return cachedHandler;
}

export const handler: Handler = async (event: any, context: Context) => {
  const serverlessHandler = await bootstrapServer();
  return serverlessHandler(event, context);
};
