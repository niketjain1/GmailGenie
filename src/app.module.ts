import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue/queue.service';
import { BullModule } from '@nestjs/bull';
import { QueueConsumer } from './queue/queue.consumer';
import { GmailHelper } from './gmail/gmail.helper';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      envFilePath: ['.env.local'],
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'processEmailsQueue',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, QueueConsumer, QueueService, GmailHelper],
})
export class AppModule {}
