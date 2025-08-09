import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationProcessorService } from './notification-processor.service';
import User from '../lib/models/user';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: 'User', schema: User.schema },
    ]),
  ],
  providers: [
    NotificationQueueService,
    NotificationProcessorService,
    NotificationsService,
  ],
  exports: [
    NotificationsService,
    NotificationQueueService,
  ],
})
export class NotificationsModule {}
