import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('processEmailsQueue') private readonly queue: Queue,
  ) {}

  async addProcessEmailsJob(access_Token: string) {
    await this.queue.empty();
    const job = await this.queue.add(
      { accessToken: access_Token },
      {
        repeat: {
          every: 60000,
        },
      },
    );
    console.log(`Job added with id: ${job.id}`);
  }
}
