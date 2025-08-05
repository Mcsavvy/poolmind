import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppConfig } from './env.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => ({
        uri: configService.get('database.uri'),
        dbName: configService.get('database.name'),
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
