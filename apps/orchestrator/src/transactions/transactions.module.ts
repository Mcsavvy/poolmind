import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { StacksPollingService } from './stacks-polling.service';
import { PoolMindContractService } from '../lib/contract-service';
import Transaction from '../lib/models/transaction';
import User from '../lib/models/user';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // Import required models
    MongooseModule.forFeature([
      { name: Transaction.name, schema: Transaction.schema },
      { name: User.name, schema: User.schema },
    ]),
    
    // Import configuration module
    ConfigModule,
    
    // Import notifications module for sending transaction notifications
    NotificationsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    StacksPollingService,
    PoolMindContractService,
  ],
  exports: [
    TransactionsService,
    StacksPollingService,
    PoolMindContractService,
  ],
})
export class TransactionsModule {}
