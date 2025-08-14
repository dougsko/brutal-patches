import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Context, Handler } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import { AppModule } from './app.module';
import * as express from 'express';

// Initialize AWS X-Ray tracing for production
if (process.env.NODE_ENV === 'production' && process.env._X_AMZN_TRACE_ID) {
  // Import X-Ray SDK only in production Lambda environment
  const AWSXRay = require('aws-xray-sdk-core');
  
  // Capture AWS SDK v3 calls
  const { captureAWSv3Client } = require('aws-xray-sdk-core');
  
  // Enable subsegment streaming for better performance
  AWSXRay.config([AWSXRay.plugins.ECSPlugin]);
  AWSXRay.middleware.enableDynamicNaming('*.brutalpatches.com');
}

let cachedHandler: any;

async function bootstrapServer() {
  if (!cachedHandler) {
    try {
      const expressApp = express();
      
      // Create NestJS application with proper error handling
      const nestApp = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
        {
          logger: process.env.NODE_ENV === 'production' ? ['error', 'warn', 'log'] : ['log', 'error', 'warn', 'debug', 'verbose'],
        }
      );

      // Configure CORS properly
      nestApp.enableCors({
        origin: [
          'https://brutalpatches.com',
          'https://www.brutalpatches.com',
          // Allow localhost for development
          ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:4200'] : [])
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      });

      // Initialize the NestJS application
      await nestApp.init();

      // Create serverless express handler with proper configuration
      cachedHandler = serverlessExpress({ 
        app: expressApp,
        logSettings: {
          level: process.env.NODE_ENV === 'production' ? 'warn' : 'info'
        }
      });
      
    } catch (error) {
      console.error('Failed to bootstrap server:', error);
      throw error;
    }
  }
  return cachedHandler;
}

export const handler: Handler = async (event: any, context: Context) => {
  try {
    // Set callback waits for empty event loop to false for better Lambda performance
    context.callbackWaitsForEmptyEventLoop = false;
    
    const serverlessHandler = await bootstrapServer();
    return await serverlessHandler(event, context);
  } catch (error) {
    console.error('Lambda handler error:', error);
    
    // Return proper HTTP error response
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'production' ? 'Server error' : error.message,
      }),
    };
  }
};
