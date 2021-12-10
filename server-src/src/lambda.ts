import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Context, Handler } from 'aws-lambda';
import { createServer, proxy } from 'aws-serverless-express';
import { eventContext } from 'aws-serverless-express/middleware';
import { Server } from 'http';
import { AppModule } from './app.module';
import express = require('express');
import exp = require('constants');


// NOTE: If you get ERR_CONTENT_DECODING_FAILED in your browser, this is likely
// due to a compressed response (e.g. gzip) which has not been handled correctly
// by aws-serverless-express and/or API Gateway. Add the necessary MIME types to
// binaryMimeTypes below
const binaryMimeTypes: string[] = [];

let cachedServer: Server;

async function bootstrapServer(): Promise<Server> {
   if (!cachedServer) {
      const expressApp = express();
      const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp))
      nestApp.use(eventContext());
      nestApp.enableCors({
         origin: 'https://brutalpatches.com',
      });
      nestApp.enableCors();
      await nestApp.init();
      cachedServer = createServer(expressApp, undefined, binaryMimeTypes);
   }
   return cachedServer;
}

export const handler: Handler = async (event: any, context: Context) => {
   cachedServer = await bootstrapServer();
   return proxy(cachedServer, event, context, 'PROMISE').promise;
}