import { Injectable } from '@nestjs/common';
import { InjectQueue, Process } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('processEmailsQueue') private readonly queue: Queue,
  ) {}

  async addProcessEmailsJob(access_Token: string) {
    await this.queue.add(
      { accessToken: access_Token },
      {
        repeat: { every: 60000 },
      },
    );
  }
}
