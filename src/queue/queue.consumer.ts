import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { AuthService } from 'src/auth/auth.service';

@Processor('processEmailsQueue')
export class GmailConsumer {
  constructor(private readonly authService: AuthService) {}

  @Process()
  async handleProcessEmailsJob(job: Job<{ accessToken: string }>) {
    console.log(JSON.stringify(job.data));
    await this.authService.processEmails(job.data.accessToken);
  }
}
