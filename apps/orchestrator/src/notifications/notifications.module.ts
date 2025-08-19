import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationProcessorService } from './notification-processor.service';
import { NotificationsController } from './notifications.controller';
import User from '../lib/models/user';
import Notification, { UserNotification } from '../lib/models/notification';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: 'User', schema: User.schema },
      { name: 'Notification', schema: Notification.schema },
      { name: 'UserNotification', schema: UserNotification.schema },
    ]),
  ],
  controllers: [
    NotificationsController,
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
