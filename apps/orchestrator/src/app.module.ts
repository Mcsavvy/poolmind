import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenApiController } from './openapi.controller';
import { DatabaseModule } from './config/database.module';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './config/env.schema';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}.local`,
      validate: validateConfig,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [AppController, OpenApiController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
