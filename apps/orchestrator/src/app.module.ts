import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenApiController } from './openapi.controller';
import { DatabaseModule } from './config/database.module';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}.local`,
      validate: validateConfig,
    }),
    DatabaseModule,
  ],
  controllers: [AppController, OpenApiController],
  providers: [AppService],
})
export class AppModule {}
