import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { GmailHelper } from 'src/gmail/gmail.helper';

@Processor('processEmailsQueue')
export class QueueConsumer {
  constructor(private readonly gmailHelper: GmailHelper) {}

  @Process()
  async handleProcessEmailsJob(job: Job) {
    console.log(`Processing Job ${job.id}`);
    console.log(JSON.stringify(job.data));
    await this.gmailHelper.processEmails(job.data.accessToken);
  }
}
