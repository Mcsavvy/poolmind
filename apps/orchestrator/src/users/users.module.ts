import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import User from '../lib/models/user';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: User.schema }]),
  ],
  controllers: [UsersController],
})
export class UsersModule {}
