import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfig } from './config/env.schema';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 Starting PoolMind Orchestrator...');
    
    const app = await NestFactory.create(AppModule);

    // Get the ConfigService instance
    const configService = app.get(ConfigService<AppConfig>);

    // Get configuration values
    const port = configService.get<number>('port')!;
    const nodeEnv = configService.get<string>('nodeEnv')!;
    const corsOrigins = configService.get<string>('corsOrigins')!;

    logger.log(`📋 Configuration loaded: environment=${nodeEnv}, port=${port}`);

    // Enable CORS with configuration
    const corsOptions = {
      origin: corsOrigins
        ? corsOrigins.split(',').map((origin) => origin.trim())
        : nodeEnv === 'development'
          ? true
          : false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
    };

    app.enableCors(corsOptions);
    logger.log('🔒 CORS configuration applied');

    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Poolmind Orchestrator API')
      .setDescription('API documentation for the Poolmind Orchestrator service')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('orchestrator')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Store document globally for the OpenAPI controller
    (global as any).openApiDocument = document;

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    
    logger.log('📚 Swagger documentation configured');

    await app.listen(port);
    
    logger.log(`✅ Orchestrator is running successfully!`);
    logger.log(`🌐 Server: http://localhost:${port}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
    logger.log(`📄 OpenAPI schema: http://localhost:${port}/api/docs-json`);
    logger.log(`💾 Download OpenAPI: http://localhost:${port}/api/openapi.json`);
    logger.log(`🛢 Database: ${configService.get('database.name')}`);
    logger.log(`🌍 Environment: ${nodeEnv}`);

    if (corsOrigins) {
      logger.log(`🔒 CORS: Allowed origins: ${corsOrigins}`);
    } else if (nodeEnv === 'development') {
      logger.log(`🔧 CORS: Allowing all origins (development mode)`);
    } else {
      logger.log(`🔒 CORS: No origins allowed (production mode)`);
    }
  } catch (error) {
    logger.error(`❌ Failed to start Orchestrator: ${error.message}`, error.stack);
    process.exit(1);
  }
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
