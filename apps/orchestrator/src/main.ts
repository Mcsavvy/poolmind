import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the ConfigService instance
  const configService = app.get(ConfigService<AppConfig>);

  // Get configuration values
  const port = configService.get<number>('port')!;
  const nodeEnv = configService.get<string>('nodeEnv')!;
  const corsOrigins = configService.get<string>('corsOrigins')!;

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

  await app.listen(port);
  console.log(`🚀 Orchestrator is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs available at: http://localhost:${port}/api/docs`,
  );
  console.log(
    `📄 OpenAPI schema available at: http://localhost:${port}/api/docs-json`,
  );
  console.log(
    `💾 Download OpenAPI schema at: http://localhost:${port}/api/openapi.json`,
  );
  console.log(`🛢 Database name: ${configService.get('database.name')}`);
  console.log(`🌍 Environment: ${nodeEnv}`);

  if (corsOrigins) {
    console.log(`🔒 CORS: Allowed origins: ${corsOrigins}`);
  } else if (nodeEnv === 'development') {
    console.log(`🔧 CORS: Allowing all origins (development mode)`);
  } else {
    console.log(`🔒 CORS: No origins allowed (production mode)`);
  }
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
